import { NextRequest, NextResponse } from "next/server";
import { S3_QUIZ_ANSWERS } from "@/lib/certificates/quiz-answers";
import { signStamp } from "@/lib/certificates/stamps";
import { stampQuest } from "@/lib/certificates/tiers";

/** Grades a Learn S3 check on the server and, when right, returns a signed "check" stamp. */
export async function POST(request: NextRequest) {
  try {
    const { quest, option, learnerId } = await request.json();
    const answer = typeof quest === "string" ? S3_QUIZ_ANSWERS[quest] : undefined;
    if (answer === undefined || !Number.isInteger(option) || option < 0 || option > 9) {
      return NextResponse.json({ error: "Unknown quest or option" }, { status: 400 });
    }
    const correct = option === answer;
    return NextResponse.json({ correct, ...(correct ? { answerIndex: answer, stamp: signStamp(stampQuest("s3", quest), "check", learnerId) } : {}) });
  } catch {
    return NextResponse.json({ error: "Could not check the answer" }, { status: 400 });
  }
}
