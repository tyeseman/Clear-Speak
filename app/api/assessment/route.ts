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
        "overallLevel",
        "speakingLevel",
        "pronunciationLevel",
        "readingLevel",
        "grammarLevel",
        "confidenceLevel",
        "overallClarityScore",
        "readingScore",
        "pronunciationScore",
        "speedScore",
        "rhythmScore",
        "mainStrengths",
        "mainWeakSounds",
        "mainWeakAreas",
        "repeatedIssues",
        "recommendedStartingPoint",
        "recommendedFirstLessonId",
        "recommendedLessonPath",
        "readingFocus",
        "conversationFocus",
        "wordDrillFocus",
        "reason",
        "encouragingSummary",
        "fourteenDayPlan",
        "recommendedFirstLesson",
        "firstSevenDayPlan"
      ],
      properties: {
        overallLevel: { type: "string", enum: ["foundational", "developing", "intermediate", "advanced", "professional", "academic"] },
        speakingLevel: { type: "string" },
        pronunciationLevel: { type: "string" },
        readingLevel: { type: "string" },
        grammarLevel: { type: "string" },
        confidenceLevel: { type: "string" },
        overallClarityScore: { type: "number", minimum: 1, maximum: 100 },
        readingScore: { type: "number", minimum: 1, maximum: 100 },
        pronunciationScore: { type: "number", minimum: 1, maximum: 100 },
        speedScore: { type: "number", minimum: 1, maximum: 100 },
        rhythmScore: { type: "number", minimum: 1, maximum: 100 },
        mainStrengths: {
          type: "array",
          minItems: 2,
          maxItems: 6,
          items: { type: "string" }
        },
        mainWeakSounds: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: { type: "string" }
        },
        mainWeakAreas: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string" }
        },
        repeatedIssues: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: { type: "string" }
        },
        recommendedStartingPoint: { type: "string" },
        recommendedFirstLessonId: { type: "string" },
        recommendedLessonPath: {
          type: "array",
          minItems: 3,
          maxItems: 10,
          items: { type: "string" }
        },
        readingFocus: { type: "string" },
        conversationFocus: { type: "string" },
        wordDrillFocus: { type: "string" },
        reason: { type: "string" },
        encouragingSummary: { type: "string" },
        fourteenDayPlan: {
          type: "array",
          minItems: 14,
          maxItems: 14,
          items: { type: "string" }
        },
        recommendedFirstLesson: { type: "string" },
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
      profile?: unknown;
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
                "You create the Smart Start placement report for KoloSpeak Coach. Place the learner respectfully from foundational through academic/professional levels. Do not shame accent, identity, grammar, education, or background. Do not force clear speakers into beginner lessons. If the speaker is strong, recommend sharpening public speaking, vocabulary, reading fluency, professional communication, or academic speech. If foundational, recommend sounds, diction, pace, final consonants, reading aloud, and confidence. Return practical lesson ids when possible: th-think, th-this, r-l-clarity, short-i-long-e, v-b, final-consonants, consonant-clusters, word-stress, sentence-rhythm, conversation-transfer."
            },
            {
              role: "user",
              content: JSON.stringify({
                expectedText: body.expectedText,
                transcribedText: body.transcribedText,
                durationSeconds: body.durationSeconds,
                missedWords: body.missedWords,
                profile: body.profile
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
