import { NextResponse } from "next/server";
import { getOpenAIKey } from "@/lib/openai";
import { rateLimit, requirePasscode } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const unauthorized = requirePasscode(request);
    if (unauthorized) return unauthorized;

    const limited = rateLimit(request, "transcribe", 30, 24 * 60 * 60 * 1000);
    if (limited) return limited;

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Please attach a short recording." },
        { status: 400 }
      );
    }

    if (audio.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Please keep recordings under 4 MB." },
        { status: 400 }
      );
    }

    const openAIForm = new FormData();
    openAIForm.set("model", "gpt-4o-mini-transcribe");
    openAIForm.set("file", audio, audio.name || "recording.webm");
    openAIForm.set("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAIKey()}`
      },
      body: openAIForm
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not transcribe the recording right now." },
        { status: response.status }
      );
    }

    const result = (await response.json()) as { text?: string };
    return NextResponse.json({ text: result.text ?? "" });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "Server is missing OPENAI_API_KEY."
        : "Could not transcribe the recording right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
