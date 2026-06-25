import { NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-init");
  if (guarded) return guarded;

  try {
    await ensureDatabase();
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
