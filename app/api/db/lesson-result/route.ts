import { NextResponse } from "next/server";
import { saveLessonResultToDb } from "@/lib/db";
import { dbError, guardDbRequest } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guarded = guardDbRequest(request, "db-lesson-result");
  if (guarded) return guarded;

  try {
    const body = (await request.json()) as Parameters<typeof saveLessonResultToDb>[0];
    if (!body.lessonId || !body.lessonTitle) {
      return NextResponse.json({ ok: false, error: "Lesson result is required." }, { status: 400 });
    }
    await saveLessonResultToDb(body);
    return NextResponse.json({ ok: true });
  } catch {
    return dbError();
  }
}
