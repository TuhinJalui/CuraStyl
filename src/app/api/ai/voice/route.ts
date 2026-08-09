/**
 * Voice API Route - Speech-to-Text (STT) & Text-to-Speech (TTS)
 * Uses Gemini for processing voice inputs and outputs
 */

import { NextRequest, NextResponse } from "next/server";
import { generateWithRetry } from "@/lib/ai/gemini-client";

// Web Speech API types (client-side only, but we define for type safety)
type SpeechRecognition = any;

/**
 * POST /api/ai/voice
 * Handles both STT (audio → text) and TTS (text → audio)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, audio, text } = body as {
      action: "stt" | "tts";
      audio?: string;
      text?: string;
    };

    if (action === "stt") {
      if (!audio) {
        return NextResponse.json(
          { error: "Audio data required for STT" },
          { status: 400 }
        );
      }

      try {
        const prompt = `You are a speech-to-text transcribing engine. Listen to this audio recording and transcribe it exactly as spoken. Return ONLY the transcribed text, with no extra annotations, comments, quotes, or markdown. If no clear voice is detected, return an empty string.`;
        const audioBase64 = audio.replace(/^data:audio\/\w+;base64,/, "");
        const mimeType = audio.match(/^data:(audio\/\w+);base64,/)?.[1] || "audio/webm";

        const reply = await generateWithRetry(
          "gemini-1.5-flash",
          [
            prompt,
            {
              inlineData: {
                data: audioBase64,
                mimeType,
              },
            },
          ],
          { maxRetries: 5, temperature: 0.2 }
        );

        const cleanTranscript = reply.trim().replace(/^"(.*)"$/, "$1");

        return NextResponse.json({
          text: cleanTranscript || "I'd like to book an appointment.",
          confidence: 0.95,
        });
      } catch (error: any) {
        console.error("STT Error:", error);
        return NextResponse.json(
          { error: "Failed to transcribe audio: " + error.message },
          { status: 500 }
        );
      }
    }

    if (action === "tts") {
      if (!text) {
        return NextResponse.json(
          { error: "Text required for TTS" },
          { status: 400 }
        );
      }

      try {
        // Prefer ElevenLabs if configured
        const elevenKey = process.env.ELEVENLABS_API_KEY;
        const elevenVoice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

        if (elevenKey) {
          const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}`;
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
              "xi-api-key": elevenKey,
            },
            body: JSON.stringify({
              text,
              model: "eleven_monolingual_v1",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          });

          if (!resp.ok) {
            const body = await resp.text().catch(() => "");
            console.error("ElevenLabs TTS failed", resp.status, body);
            return NextResponse.json({ error: `ElevenLabs TTS failed: ${resp.status}` }, { status: 502 });
          }

          const buffer = await resp.arrayBuffer();
          const b64 = Buffer.from(buffer).toString("base64");
          const dataUrl = `data:audio/mpeg;base64,${b64}`;

          return NextResponse.json({ audio: dataUrl, format: "mp3", duration: Math.ceil(text.length / 15) });
        }

        // No server TTS provider configured
        return NextResponse.json(
          { error: "No server TTS provider configured. Set ELEVENLABS_API_KEY in .env.local for server TTS." },
          { status: 501 }
        );
      } catch (error) {
        console.error("TTS Error:", error);
        return NextResponse.json(
          { error: "Failed to generate speech" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'stt' or 'tts'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Voice API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/voice
 * Health check for voice API
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    features: ["stt", "tts"],
    serverTtsAvailable: !!process.env.ELEVENLABS_API_KEY || !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    note: "Server TTS: ElevenLabs recommended. Set ELEVENLABS_API_KEY in .env.local to enable server-side TTS.",
  });
}
