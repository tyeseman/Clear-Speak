import { NextResponse } from "next/server";
import { getOpenAIKey } from "@/lib/openai";
import { rateLimit, requirePasscode } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const unauthorized = requirePasscode(request);
    if (unauthorized) return unauthorized;

    const limited = rateLimit(request, "realtime-session", 20, 24 * 60 * 60 * 1000);
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as { focusArea?: string };
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAIKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions:
          "You are KoloSpeak Coach live pronunciation support. Keep feedback short. Focus on word-level clarity, mouth/tongue tips, final consonants, TH, R/L, V/B, vowels, clusters, stress, rhythm, and speed control.",
        input_audio_transcription: {
          model: "gpt-4o-mini-transcribe"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          silence_duration_ms: 650
        },
        metadata: {
          feature: "live-word-drill",
          focusArea: body.focusArea ?? "pronunciation clarity"
        }
      })
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "Realtime session unavailable." }, { status: response.status });
    }

    const session = await response.json();
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "Server is missing OPENAI_API_KEY."
        : "Could not create realtime session.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
