import { NextResponse } from "next/server";
import { saveSoundScoreToDb } from "@/lib/db";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-sound-score");
  if (guarded) return guarded;

  try {
    const body = (await request.json()) as Parameters<typeof saveSoundScoreToDb>[0];
    if (!body.soundKey) {
      return NextResponse.json({ ok: false, error: "Sound score is required." }, { status: 400 });
    }
    await saveSoundScoreToDb(body);
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
