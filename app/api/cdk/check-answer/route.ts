import { NextRequest, NextResponse } from "next/server";
import { CDK_QUIZ_ANSWERS } from "@/lib/certificates/quiz-answers";
import { signStamp } from "@/lib/certificates/stamps";
import { stampQuest } from "@/lib/certificates/tiers";

/** Grades a Learn CDK check on the server and, when right, returns a signed "check" stamp. */
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const { quest, option, learnerId } = JSON.parse(raw);
    const answer = typeof quest === "string" && Object.hasOwn(CDK_QUIZ_ANSWERS, quest) ? CDK_QUIZ_ANSWERS[quest] : undefined;
    if (answer === undefined || !Number.isInteger(option) || option < 0 || option > 7) {
      return NextResponse.json({ error: "Unknown quest or option" }, { status: 400 });
    }
    const correct = option === answer;
    return NextResponse.json({ correct, ...(correct ? { answerIndex: answer, stamp: signStamp(stampQuest("cdk", quest), "check", learnerId) } : {}) });
  } catch {
    return NextResponse.json({ error: "Could not check the answer" }, { status: 400 });
  }
}
