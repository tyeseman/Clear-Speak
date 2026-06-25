import { NextResponse } from "next/server";
import { databaseStatus } from "@/lib/db";
import { rateLimit, requirePasscode } from "@/lib/security";

export function guardDbRequest(request: Request, area: string) {
  const unauthorized = requirePasscode(request);
  if (unauthorized) return unauthorized;

  const limited = rateLimit(request, area, 120, 15 * 60 * 1000);
  if (limited) return limited;

  const status = databaseStatus();
  if (!status.configured) {
    return NextResponse.json(
      { ok: false, error: "Database is not configured." },
      { status: 503 }
    );
  }

  return null;
}

export function dbError() {
  return NextResponse.json(
    { ok: false, error: "Database request failed." },
    { status: 500 }
  );
}
