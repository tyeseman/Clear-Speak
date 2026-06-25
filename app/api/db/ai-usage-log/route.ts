import { NextResponse } from "next/server";
import { saveAiUsageLogToDb } from "@/lib/db";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-ai-usage-log");
  if (guarded) return guarded;

  try {
    const body = (await request.json()) as Parameters<typeof saveAiUsageLogToDb>[0];
    if (!body.feature) {
      return NextResponse.json({ ok: false, error: "Usage feature is required." }, { status: 400 });
    }
    await saveAiUsageLogToDb(body);
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
