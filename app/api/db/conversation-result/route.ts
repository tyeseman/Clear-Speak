import { NextResponse } from "next/server";
import { saveConversationResultToDb } from "@/lib/db";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-conversation-result");
  if (guarded) return guarded;

  try {
    const body = (await request.json()) as Parameters<typeof saveConversationResultToDb>[0];
    if (!body.prompt || !body.transcript) {
      return NextResponse.json({ ok: false, error: "Conversation result is required." }, { status: 400 });
    }
    await saveConversationResultToDb(body);
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
