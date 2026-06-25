import { NextResponse } from "next/server";
import { openAIJson } from "@/lib/openai";
import type { AssessmentReport } from "@/lib/types";
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

const assessmentSchema = {
  type: "json_schema",
  json_schema: {
    name: "baseline_assessment_report",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "overallClarityScore",
        "readingScore",
        "pronunciationScore",
        "speedScore",
        "mainWeakSounds",
        "firstSevenDayPlan"
      ],
      properties: {
        overallClarityScore: { type: "number", minimum: 1, maximum: 100 },
        readingScore: { type: "number", minimum: 1, maximum: 100 },
        pronunciationScore: { type: "number", minimum: 1, maximum: 100 },
        speedScore: { type: "number", minimum: 1, maximum: 100 },
        mainWeakSounds: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: { type: "string" }
        },
        firstSevenDayPlan: {
          type: "array",
          minItems: 7,
          maxItems: 7,
          items: { type: "string" }
        }
      }
    },
    strict: true
  }
};

export async function POST(request: Request) {
  try {
    const unauthorized = requirePasscode(request);
    if (unauthorized) return unauthorized;

    const limited = rateLimit(request, "assessment", 5, 24 * 60 * 60 * 1000);
    if (limited) return limited;

    const body = (await request.json()) as {
      expectedText?: string;
      transcribedText?: string;
      durationSeconds?: number;
      missedWords?: string[];
    };

    if (!body.expectedText || !body.transcribedText) {
      return NextResponse.json(
        { error: "Expected and transcribed text are required." },
        { status: 400 }
      );
    }

    const result = await openAIJson<ChatResponse>(
      "chat/completions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: assessmentSchema,
          messages: [
            {
              role: "system",
              content:
                "You create a direct baseline clarity report for a private KoloSpeak Coach user. Do not shame accent or identity. Be honest about weak areas and practical about improvement. Focus on clarity, reading, speed, skipped endings, TH, R/L, V/B, short I/long E, stress, rhythm, and the drills needed for stronger adult diction."
            },
            {
              role: "user",
              content: JSON.stringify({
                expectedText: body.expectedText,
                transcribedText: body.transcribedText,
                durationSeconds: body.durationSeconds,
                missedWords: body.missedWords
              })
            }
          ]
        })
      },
      "Could not create baseline assessment"
    );

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Assessment report was empty. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(JSON.parse(content) as AssessmentReport);
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "Server is missing OPENAI_API_KEY."
        : "Could not create baseline report right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
