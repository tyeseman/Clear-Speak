import { NextResponse } from "next/server";
import { openAIJson } from "@/lib/openai";
import { rateLimit, requirePasscode } from "@/lib/security";
import type { CoachPlanUpdate, ProgressState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const planSchema = {
  type: "json_schema",
  json_schema: {
    name: "coach_plan_update",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "currentLevel",
        "progressSummary",
        "mainWeakAreas",
        "improvedAreas",
        "nextFocusArea",
        "recommendedLessons",
        "recommendedWordBankFocus",
        "readingFocus",
        "conversationFocus",
        "reason"
      ],
      properties: {
        currentLevel: { type: "string" },
        progressSummary: { type: "string" },
        mainWeakAreas: { type: "array", maxItems: 6, items: { type: "string" } },
        improvedAreas: { type: "array", maxItems: 6, items: { type: "string" } },
        nextFocusArea: { type: "string" },
        recommendedLessons: { type: "array", maxItems: 7, items: { type: "string" } },
        recommendedWordBankFocus: { type: "string" },
        readingFocus: { type: "string" },
        conversationFocus: { type: "string" },
        reason: { type: "string" }
      }
    },
    strict: true
  }
};

export async function POST(request: Request) {
  try {
    const unauthorized = requirePasscode(request);
    if (unauthorized) return unauthorized;

    const limited = rateLimit(request, "coach-update-plan", 8, 24 * 60 * 60 * 1000);
    if (limited) return limited;

    const body = (await request.json()) as {
      trigger?: "lesson-completion" | "assessment-completion" | "weekly-review" | "word-bank-mostly-complete" | "manual";
      progress?: ProgressState;
    };
    if (!body.progress || !body.trigger) {
      return NextResponse.json({ ok: false, error: "Progress and trigger are required." }, { status: 400 });
    }

    const result = await openAIJson<ChatResponse>(
      "chat/completions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: planSchema,
          messages: [
            {
              role: "system",
              content:
                "Update KoloSpeak Coach's learning direction from saved progress. Do not shame accent or identity. Keep weak sounds in review, mark improving areas, and recommend practical next lessons, reading focus, conversation focus, and word-bank focus."
            },
            {
              role: "user",
              content: JSON.stringify({
                trigger: body.trigger,
                baselineReport: body.progress.baselineReport,
                learnerProfile: body.progress.learnerProfile,
                latestLessonResults: body.progress.lessonAttempts.slice(-12),
                wordDrillAttempts: body.progress.wordDrillAttempts.slice(-50),
                reviewLaterWords: body.progress.reviewLaterWords,
                masteredWords: body.progress.masteredWords,
                readingResults: body.progress.readingSessions.slice(-10),
                conversationResults: body.progress.conversationSessions.slice(-10),
                soundScores: body.progress.soundScores,
                speedTrend: body.progress.speakingSpeeds.slice(-15),
                readingAccuracyTrend: body.progress.readingAccuracies.slice(-15)
              })
            }
          ]
        })
      },
      "Could not update coach plan"
    );

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ ok: false, error: "Coach update was empty." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, update: JSON.parse(content) as CoachPlanUpdate });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "Server is missing OPENAI_API_KEY."
        : "Could not update the learning plan right now.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
