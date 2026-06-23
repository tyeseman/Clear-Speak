import { NextResponse } from "next/server";
import {
  getAllowedEmails,
  getConfiguredPasscode,
  hashValue,
  isAllowedEmail,
  rateLimit
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(request, "auth", 10, 15 * 60 * 1000);
  if (limited) return limited;

  const configured = getConfiguredPasscode();
  if (!configured) {
    return NextResponse.json(
      { error: "Server is missing CLEARSPEAK_PASSCODE." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { email?: string; passcode?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const passcode = body.passcode ?? "";

  if (!isAllowedEmail(email)) {
    return NextResponse.json(
      {
        error: "You do not have access to this private app.",
        allowedEmails: getAllowedEmails()
      },
      { status: 403 }
    );
  }

  if (hashValue(passcode) !== hashValue(configured)) {
    return NextResponse.json({ error: "That passcode did not work." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, email });
}
