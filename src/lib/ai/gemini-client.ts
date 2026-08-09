/**
 * ADVANCED Gemini API Client with Intelligent Key Rotation
 * Cycles through 10 API keys to prevent quota exhaustion
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// API Keys from environment
const getAPIKeys = () => {
  const keys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
  ].filter((k): k is string => typeof k === 'string' && k.length > 10);
  
  console.log(`[Gemini] Loaded ${keys.length} API keys`);
  return keys;
};

let API_KEYS: string[] = [];
let currentKeyIndex = 0;
let keyFailureCount: Map<number, number> = new Map();
let SUPPORTED_MODEL: string | null = null;

// Initialize
export function initializeGeminiClient() {
  API_KEYS = getAPIKeys();
  currentKeyIndex = 0;
  keyFailureCount.clear();
  
  API_KEYS.forEach((_, idx) => keyFailureCount.set(idx, 0));
  
  if (API_KEYS.length === 0) {
    console.warn("[Gemini] No API keys configured!");
  }
}

// Fetch list of available models from Google Generative API using an API key
async function listModelsForKey(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ListModels failed: ${res.status} ${body}`);
  }
  // Attempt to parse JSON, but tolerate non-JSON responses (HTML/error pages)
  try {
    return await res.json();
  } catch (err) {
    const text = await res.text();
    console.warn('[Gemini] listModels response not JSON, returning raw text for diagnostics');
    return { rawText: text };
  }
}

// Discover a Gemini model that supports generation and set SUPPORTED_MODEL.
export async function discoverSupportedModel(): Promise<string | null> {
  if (API_KEYS.length === 0) initializeGeminiClient();

  for (let idx = 0; idx < API_KEYS.length; idx++) {
    const apiKey = API_KEYS[idx];
    try {
      const data = await listModelsForKey(apiKey);
      const models = data?.models || data;
      if (!models || !Array.isArray(models)) {
        console.warn("[Gemini] Unexpected ListModels response", data);
        continue;
      }

      // Prefer any model that contains 'gemini' and appears to support generation
      for (const m of models) {
        const fullName: string = m?.name || "";
        if (!/gemini/i.test(fullName)) continue;

        // If server reports supported methods, prefer ones that include generate
        const methods = m?.supportedGenerationMethods || m?.supportedMethods || m?.supported || null;
        if (!methods) {
          SUPPORTED_MODEL = fullName.split("/").pop() || null;
          console.log(`[Gemini] Discovered candidate model: ${SUPPORTED_MODEL}`);
          return SUPPORTED_MODEL;
        }

        const hasGenerate = Array.isArray(methods) && methods.some((x: string) => /generate/i.test(String(x)));
        if (hasGenerate) {
          SUPPORTED_MODEL = fullName.split("/").pop() || null;
          console.log(`[Gemini] Discovered supported model: ${SUPPORTED_MODEL}`);
          return SUPPORTED_MODEL;
        }
      }
    } catch (err: any) {
      console.warn(`[Gemini] ListModels failed for key ${idx}:`, String(err));
      // try next key
    }
  }

  console.warn("[Gemini] No supported Gemini model discovered");
  return null;
}

// Get current active key
function getActiveKey(): string {
  if (API_KEYS.length === 0) {
    throw new Error("No Gemini API keys configured");
  }
  return API_KEYS[currentKeyIndex];
}

// Rotate to next key
function rotateKey(): void {
  const failedIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  
  const currentFailures = keyFailureCount.get(failedIndex) || 0;
  keyFailureCount.set(failedIndex, currentFailures + 1);
  
  console.log(`[Gemini] Rotated from key ${failedIndex} to ${currentKeyIndex} (failures: ${currentFailures + 1})`);
}

// Safety settings
export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Generate content with retry
export async function generateWithRetry(
  modelName: string,
  prompt: string | any[],
  options?: {
    maxRetries?: number;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  if (API_KEYS.length === 0) {
    initializeGeminiClient();
  }
  
  if (API_KEYS.length === 0) {
    throw new Error("No Gemini API keys configured");
  }

  const maxRetries = options?.maxRetries || API_KEYS.length;
  let attempts = 0;
  const triedKeys = new Set<number>();

  // Map legacy model name to the currently-supported variant
  const correctedModelName = modelName === "gemini-1.5-flash" ? "gemini-1.5-flash-latest" : modelName;

  // If caller requested a Gemini model, try to discover a working Gemini model first
  let finalModelName = correctedModelName;
  if (/gemini/i.test(correctedModelName)) {
    if (!SUPPORTED_MODEL) {
      try {
        await discoverSupportedModel();
      } catch (err) {
        console.warn("[Gemini] Model discovery failed:", err);
      }
    }

    if (SUPPORTED_MODEL) {
      finalModelName = SUPPORTED_MODEL;
    }
  }

  while (attempts < maxRetries) {
    const keyIndex = currentKeyIndex;
    
    if (triedKeys.has(keyIndex) && triedKeys.size >= API_KEYS.length) {
      throw new Error("All API keys exhausted");
    }
    
    triedKeys.add(keyIndex);
    attempts++;

    try {
      const apiKey = getActiveKey();
      console.log(`[Gemini] Using model ${finalModelName} with key ${keyIndex}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: finalModelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Success - reset failure count
      keyFailureCount.set(keyIndex, 0);
      
      return text;
    } catch (error: any) {
      const errMsg = (error && (error.message || JSON.stringify(error))) || String(error);
      console.error(`[Gemini] Attempt ${attempts} failed with key ${keyIndex}:`, errMsg);

      // Detect common error classes
      const isModelNotFound = /not found|is not found for API version|404/i.test(errMsg);
      const isQuotaError = /quota|rate limit|429|resource.*exhaust/i.test(errMsg);
      const isAuthError = /unauthorized|invalid api key|invalid key|401|permission/i.test(errMsg);

      // If the model itself isn't available (404 / model not found), fail fast with clear message
      if (isModelNotFound) {
        throw new Error(`Gemini model not found or unsupported: ${correctedModelName}. ${errMsg}`);
      }

      // Rotate on quota or auth-related problems and continue trying other keys
      if ((isQuotaError || isAuthError) && attempts < maxRetries) {
        rotateKey();
      } else if (attempts >= maxRetries) {
        throw new Error("All API keys exhausted after maximum retry attempts");
      } else {
        // Unknown/transient error: rotate and try next key
        rotateKey();
      }
    }
  }

  throw new Error("Failed to generate content after all retries");
}

// Generate with image
export async function generateWithImage(
  modelName: string,
  prompt: string,
  imageData: { inlineData: { data: string; mimeType: string } },
  options?: {
    maxRetries?: number;
    temperature?: number;
  }
): Promise<string> {
  // Combine text and image for Gemini
  const contents = [prompt, imageData];
  return generateWithRetry(modelName, contents, options);
}

// Get current key status
export function getKeyStatus() {
  return {
    currentKeyIndex,
    totalKeys: API_KEYS.length,
    failures: Object.fromEntries(keyFailureCount),
  };
}

// Initialize on load
initializeGeminiClient();