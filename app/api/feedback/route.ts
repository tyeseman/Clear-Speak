import { NextResponse } from "next/server";
import { openAIJson } from "@/lib/openai";
import type { FeedbackResult, PracticeSubmission } from "@/lib/types";
import { rateLimit, requirePasscode } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const feedbackSchema = {
  type: "json_schema",
  json_schema: {
    name: "pronunciation_feedback",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "score",
        "whatImproved",
        "mainIssue",
        "mouthTip",
        "tryAgainSentence",
        "practiceWords",
        "needsWork",
        "spokeTooFast",
        "skippedWords",
        "skippedEndings",
        "finalConsonantIssue",
        "readingAccuracy",
        "speakingSpeedWpm"
      ],
      properties: {
        score: { type: "number", minimum: 1, maximum: 100 },
        whatImproved: { type: "string" },
        mainIssue: { type: "string" },
        mouthTip: { type: "string" },
        tryAgainSentence: { type: "string" },
        practiceWords: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          items: { type: "string" }
        },
        needsWork: { type: "string" },
        spokeTooFast: { type: "boolean" },
        skippedWords: {
          type: "array",
          maxItems: 10,
          items: { type: "string" }
        },
        skippedEndings: {
          type: "array",
          maxItems: 10,
          items: { type: "string" }
        },
        finalConsonantIssue: { type: "boolean" },
        readingAccuracy: { type: "number", minimum: 0, maximum: 100 },
        speakingSpeedWpm: { type: "number", minimum: 0, maximum: 260 }
      }
    },
    strict: true
  }
};

export async function POST(request: Request) {
  try {
    const unauthorized = requirePasscode(request);
    if (unauthorized) return unauthorized;

    const limited = rateLimit(request, "feedback", 30, 24 * 60 * 60 * 1000);
    if (limited) return limited;

    const body = (await request.json()) as PracticeSubmission;

    if (!body.expectedText || !body.transcribedText || !body.targetSound) {
      return NextResponse.json(
        { error: "Expected text, transcription, and target sound are required." },
        { status: 400 }
      );
    }

    const result = await openAIJson<ChatResponse>(
      "chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: feedbackSchema,
          messages: [
            {
              role: "system",
              content:
                "You are ClearSpeak Coach for a Liberian English/Koloqua speaker. Give kind, direct, simple pronunciation feedback. Never shame accent or identity. Focus on clarity, confidence, final consonants, skipped words, TH, R/L, V/B, short I/long E, speed, stress, and rhythm."
            },
            {
              role: "user",
              content: JSON.stringify({
                targetSound: body.targetSound,
                lessonId: body.lessonId,
                expectedText: body.expectedText,
                transcribedText: body.transcribedText,
                durationSeconds: body.durationSeconds
              })
            }
          ]
        })
      },
      "Could not create feedback"
    );

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Feedback was empty. Please try again." },
        { status: 502 }
      );
    }

    const feedback = JSON.parse(content) as FeedbackResult;
    return NextResponse.json(feedback);
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "Server is missing OPENAI_API_KEY."
        : "Could not create feedback right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
