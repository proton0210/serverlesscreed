import { NextRequest, NextResponse } from "next/server";
import { QUIZ_ANSWERS } from "@/lib/certificates/quiz-answers";
import { signStamp } from "@/lib/certificates/stamps";

/** Grades a quest check on the server and, when right, returns a signed "check" stamp. */
export async function POST(request: NextRequest) {
  try {
    const { quest, option, learnerId } = await request.json();
    const answer = typeof quest === "string" ? QUIZ_ANSWERS[quest] : undefined;
    if (answer === undefined || !Number.isInteger(option) || option < 0 || option > 9) {
      return NextResponse.json({ error: "Unknown quest or option" }, { status: 400 });
    }
    const correct = option === answer;
    return NextResponse.json({ correct, ...(correct ? { answerIndex: answer, stamp: signStamp(quest, "check", learnerId) } : {}) });
  } catch {
    return NextResponse.json({ error: "Could not check the answer" }, { status: 400 });
  }
}
