import { NextResponse } from "next/server";
import { loadProgressFromDb, saveProgressToDb } from "@/lib/db";
import type { ProgressState } from "@/lib/types";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guarded = guardDbRequest(request, "db-progress");
  if (guarded) return guarded;

  try {
    const progress = await loadProgressFromDb();
    return NextResponse.json({ ok: true, progress });
  } catch {
    return dbError();
  }
}

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-progress");
  if (guarded) return guarded;

  try {
    const body = (await request.json()) as { progress?: ProgressState };
    if (!body.progress) {
      return NextResponse.json({ ok: false, error: "Progress is required." }, { status: 400 });
    }
    await saveProgressToDb(body.progress);
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
