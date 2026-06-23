import { NextResponse } from "next/server";
import { createHash } from "crypto";

type Bucket = {
  count: number;
  resetAt: number;
};

const globalForLimits = globalThis as typeof globalThis & {
  clearspeakRateLimits?: Map<string, Bucket>;
};

const buckets = globalForLimits.clearspeakRateLimits ?? new Map<string, Bucket>();
globalForLimits.clearspeakRateLimits = buckets;

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getConfiguredPasscode() {
  return process.env.CLEARSPEAK_PASSCODE || process.env.APP_PASSCODE || "";
}

export function getAllowedEmails() {
  return (process.env.ALLOWED_EMAILS || "hello@leonctyes.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string) {
  return getAllowedEmails().includes(email.trim().toLowerCase());
}

export function requirePasscode(request: Request) {
  const configured = getConfiguredPasscode();
  if (!configured) {
    return NextResponse.json(
      { error: "Server is missing CLEARSPEAK_PASSCODE." },
      { status: 500 }
    );
  }

  const supplied = request.headers.get("x-clearspeak-passcode") ?? "";
  if (hashValue(supplied) !== hashValue(configured)) {
    return NextResponse.json({ error: "Private access required." }, { status: 401 });
  }

  const email = request.headers.get("x-clearspeak-email") ?? "";
  if (!isAllowedEmail(email)) {
    return NextResponse.json(
      { error: "You do not have access to this private app." },
      { status: 403 }
    );
  }

  return null;
}

export function rateLimit(
  request: Request,
  area: string,
  maxRequests: number,
  windowMs: number
) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "local";
  const passcodeHash = hashValue(request.headers.get("x-clearspeak-passcode") ?? "none").slice(0, 16);
  const key = `${area}:${ip}:${passcodeHash}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= maxRequests) {
    return NextResponse.json(
      { error: "Usage limit reached. Please wait before trying again." },
      { status: 429 }
    );
  }

  bucket.count += 1;
  return null;
}
