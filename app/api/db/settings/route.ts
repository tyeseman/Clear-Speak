import { NextResponse } from "next/server";
import { loadSettingsFromDb, saveSettingsToDb } from "@/lib/db";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guarded = guardDbRequest(request, "db-settings");
  if (guarded) return guarded;

  try {
    const settings = await loadSettingsFromDb();
    return NextResponse.json({ ok: true, settings });
  } catch {
    return dbError();
  }
}

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-settings");
  if (guarded) return guarded;

  try {
    const body = (await request.json()) as { settings?: unknown };
    await saveSettingsToDb(body.settings ?? {});
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
