import { NextResponse } from "next/server";
import { saveWordDrillAttemptToDb } from "@/lib/db";
import { rateLimit, requirePasscode } from "@/lib/security";
import type { WordDrillAttempt } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = requirePasscode(request);
  if (unauthorized) return unauthorized;

  const limited = rateLimit(request, "word-drill-attempt", 300, 24 * 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = (await request.json()) as WordDrillAttempt & { wordBankItemId?: number };
    if (!body.word || !body.targetSound) {
      return NextResponse.json({ ok: false, error: "Word and target sound are required." }, { status: 400 });
    }
    await saveWordDrillAttemptToDb(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save word attempt." }, { status: 500 });
  }
}
