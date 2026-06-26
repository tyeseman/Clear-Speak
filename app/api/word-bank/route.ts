import { NextResponse } from "next/server";
import { loadLatestWordBankFromDb, saveWordBankToDb } from "@/lib/db";
import { openAIJson } from "@/lib/openai";
import { rateLimit, requirePasscode } from "@/lib/security";
import type { ProgressState, WordBank, WordBankItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const wordBankSchema = {
  type: "json_schema",
  json_schema: {
    name: "word_bank",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["focusArea", "soundCategory", "sourceReason", "items"],
      properties: {
        focusArea: { type: "string" },
        soundCategory: { type: "string" },
        sourceReason: { type: "string" },
        items: {
          type: "array",
          minItems: 25,
          maxItems: 100,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "word",
              "targetSound",
              "difficulty",
              "mouthTip",
              "exampleSentence",
              "commonMistake",
              "soundCategory",
              "reasonSelected"
            ],
            properties: {
              word: { type: "string" },
              targetSound: { type: "string" },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              mouthTip: { type: "string" },
              exampleSentence: { type: "string" },
              commonMistake: { type: "string" },
              soundCategory: { type: "string" },
              reasonSelected: { type: "string" }
            }
          }
        }
      }
    },
    strict: true
  }
};

export async function GET(request: Request) {
  const unauthorized = requirePasscode(request);
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const focusArea = url.searchParams.get("focusArea") ?? undefined;
    const bank = await loadLatestWordBankFromDb(focusArea);
    return NextResponse.json({ ok: true, bank });
  } catch {
    return NextResponse.json({ ok: false, bank: null }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = requirePasscode(request);
    if (unauthorized) return unauthorized;

    const limited = rateLimit(request, "word-bank-generate", 8, 24 * 60 * 60 * 1000);
    if (limited) return limited;

    const body = (await request.json()) as {
      batchSize?: 25 | 50 | 100;
      focusArea?: string;
      force?: boolean;
      progress?: ProgressState;
    };
    const batchSize = [25, 50, 100].includes(Number(body.batchSize))
      ? (Number(body.batchSize) as 25 | 50 | 100)
      : 50;
    const focusArea = body.focusArea || body.progress?.learnerProfile.focusArea || "pronunciation clarity";

    if (!body.force) {
      const existing = await loadLatestWordBankFromDb(focusArea).catch(() => null);
      if (existing && completionRate(existing) < 0.8) {
        return NextResponse.json({ ok: true, bank: existing, reused: true });
      }
    }

    const result = await openAIJson<ChatResponse>(
      "chat/completions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          response_format: wordBankSchema,
          messages: [
            {
              role: "system",
              content:
                "Create targeted pronunciation word banks for KoloSpeak Coach. Do not generate random words only. Use adult practical words, professional speech, reading fluency needs, and Liberian English/Koloqua clarity goals without shaming accent identity."
            },
            {
              role: "user",
              content: JSON.stringify({
                requestedBatchSize: batchSize,
                focusArea,
                weakSounds: body.progress?.baselineReport?.mainWeakSounds,
                repeatedIssues: body.progress?.baselineReport?.repeatedIssues,
                missedWords: body.progress?.missedWords,
                skippedWords: body.progress?.skippedWords,
                reviewLaterWords: body.progress?.reviewLaterWords,
                masteredWords: body.progress?.masteredWords,
                recentLessonAttempts: body.progress?.lessonAttempts.slice(-10),
                recentReadingSessions: body.progress?.readingSessions.slice(-5),
                recentConversationSessions: body.progress?.conversationSessions.slice(-5)
              })
            }
          ]
        })
      },
      "Could not generate word bank"
    );

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ ok: false, error: "Word bank was empty." }, { status: 502 });
    }

    const parsed = JSON.parse(content) as Omit<WordBank, "batchSize" | "items"> & {
      items: Array<Omit<WordBankItem, "status" | "attempts" | "bestScore">>;
    };
    const bank: WordBank = {
      focusArea: parsed.focusArea || focusArea,
      soundCategory: parsed.soundCategory || focusArea,
      batchSize,
      sourceReason: parsed.sourceReason || "Generated from current learner progress.",
      items: parsed.items.slice(0, batchSize).map((item) => ({
        ...item,
        status: "new",
        attempts: 0,
        bestScore: 0
      }))
    };

    const savedBank = await saveWordBankToDb(bank);
    return NextResponse.json({ ok: true, bank: savedBank ?? bank, reused: false });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "Server is missing OPENAI_API_KEY."
        : "Could not generate word bank right now.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function completionRate(bank: WordBank) {
  if (!bank.items.length) return 1;
  const done = bank.items.filter((item) => item.status === "mastered" || item.status === "review-later").length;
  return done / bank.items.length;
}
