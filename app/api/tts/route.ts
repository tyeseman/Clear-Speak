import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getOpenAIKey } from "@/lib/openai";
import { rateLimit, requirePasscode } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TtsRequest = {
  text?: string;
  speed?: number;
};

export async function POST(request: Request) {
  try {
    const unauthorized = requirePasscode(request);
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as TtsRequest;
    const text = body.text?.trim();
    const speed = Math.min(Math.max(body.speed ?? 1, 0.7), 1.1);

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    if (text.length > 1200) {
      return NextResponse.json(
        { error: "Please use shorter text for practice audio." },
        { status: 400 }
      );
    }

    const cacheDir = path.join(process.cwd(), ".cache", "tts");
    const cacheKey = createHash("sha256")
      .update(JSON.stringify({ text, speed, voice: "alloy" }))
      .digest("hex");
    const cachePath = path.join(cacheDir, `${cacheKey}.mp3`);

    try {
      const cached = await readFile(cachePath);
      return new Response(cached, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    } catch {
      await mkdir(cacheDir, { recursive: true });
    }

    const limited = rateLimit(request, "tts", 25, 24 * 60 * 60 * 1000);
    if (limited) return limited;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAIKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: text,
        speed
      })
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not create practice audio right now." },
        { status: response.status }
      );
    }

    const audio = Buffer.from(await response.arrayBuffer());
    await writeFile(cachePath, audio);

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "Server is missing OPENAI_API_KEY."
        : "Could not create practice audio right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
