/**
 * AI Beauty Engine Configuration
 * 
 * Centralized configuration management for API keys and environment variables.
 * Provides safe access to environment variables with validation.
 * 
 * @see Requirements: 4.2, 7.7
 */

/**
 * Get OpenAI API key from environment
 * 
 * For client-side usage, the key should be exposed via NEXT_PUBLIC_ prefix
 * For server-side usage, use the standard OPENAI_API_KEY
 * 
 * @returns OpenAI API key or empty string if not configured
 */
export function getOpenAIApiKey(): string {
  // Prefer Gemini API keys (server-side). Return the first configured GEMINI key.
  const geminiKeys = [
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
  ].filter((k): k is string => typeof k === 'string' && k.trim() !== '');

  if (geminiKeys.length > 0) return geminiKeys[0];

  // Try client-side OpenAI key (if intentionally exposed)
  if (typeof window !== 'undefined') {
    const clientKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (clientKey && clientKey.trim() !== '' && clientKey !== 'your_openai_api_key') {
      return clientKey;
    }
  }

  // Fall back to server-side OpenAI key
  const serverKey = process.env.OPENAI_API_KEY;
  if (serverKey && serverKey.trim() !== '' && serverKey !== 'your_openai_api_key') {
    return serverKey;
  }

  return '';
}

/**
 * Check if OpenAI API is configured
 * 
 * @returns True if API key is available and valid
 */
export function isOpenAIConfigured(): boolean {
  const key = getOpenAIApiKey();
  // Accept OpenAI keys (sk-...), Gemini keys (often start with AQ. or ya29.) or any non-empty key
  return key !== '' && key.length > 10;
}

/**
 * AI Beauty Engine Configuration
 */
export interface AIBeautyConfig {
  /** Primary AI API key (Gemini or OpenAI) */
  openaiApiKey: string;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Maximum API request timeout (ms) */
  apiTimeout?: number;
  
  /** Enable result caching */
  enableCaching?: boolean;
}

/**
 * Get default AI Beauty Engine configuration
 * 
 * @returns Configuration object with environment variables loaded
 */
export function getDefaultConfig(): AIBeautyConfig {
  return {
    openaiApiKey: getOpenAIApiKey(),
    debug: process.env.NODE_ENV === 'development',
    apiTimeout: 10000,
    enableCaching: true,
  };
}

/**
 * Validate configuration
 * 
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: AIBeautyConfig): void {
  if (!config.openaiApiKey || config.openaiApiKey.trim() === '') {
    throw new Error(
      'AI API key is required. Please set at least one GEMINI_API_KEY_* or OPENAI_API_KEY environment variable.'
    );
  }

  if (config.openaiApiKey.length < 10) {
    throw new Error('AI API key appears too short or invalid. Please verify your keys.');
  }
}
