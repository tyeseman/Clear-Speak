import { NextResponse } from "next/server";
import { resetUserProgressInDb } from "@/lib/db";
import type { ProgressState } from "@/lib/types";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-reset");
  if (guarded) return guarded;

  try {
    const body = (await request.json()) as { progress?: ProgressState };
    if (!body.progress) {
      return NextResponse.json({ ok: false, error: "Reset progress is required." }, { status: 400 });
    }
    await resetUserProgressInDb(body.progress);
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
