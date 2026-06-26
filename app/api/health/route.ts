import { NextResponse } from "next/server";
import { databaseStatus, ensureDatabase } from "@/lib/db";
import { rateLimit, requirePasscode } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = requirePasscode(request);
  if (unauthorized) return unauthorized;

  const limited = rateLimit(request, "health", 60, 15 * 60 * 1000);
  if (limited) return limited;

  const dbStatus = databaseStatus();
  let database = dbStatus.configured ? "configured" : "missing env";
  if (dbStatus.configured) {
    try {
      await ensureDatabase();
      database = "connected";
    } catch {
      database = "connection failed";
    }
  }

  return NextResponse.json({
    ok: true,
    database,
    openai: process.env.OPENAI_API_KEY ? "configured" : "missing env",
    allowedEmails: process.env.ALLOWED_EMAILS ? "configured" : "default",
    appSessionSecret: process.env.APP_SESSION_SECRET ? "configured" : "missing env"
  });
}
