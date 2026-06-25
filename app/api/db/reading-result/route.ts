import { NextResponse } from "next/server";
import { saveReadingResultToDb } from "@/lib/db";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-reading-result");
  if (guarded) return guarded;

  try {
    const body = (await request.json()) as Parameters<typeof saveReadingResultToDb>[0];
    if (!body.passageId || !body.topic || !body.level) {
      return NextResponse.json({ ok: false, error: "Reading result is required." }, { status: 400 });
    }
    await saveReadingResultToDb(body);
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
