"use client";

import { useState, type ReactNode } from "react";
import { FiArrowRight, FiCheck, FiRotateCcw, FiX } from "react-icons/fi";
import { CritterIcon, type CritterMood } from "@/components/dynamodb/scene/critter-svg";
import { useProgress } from "@/components/learn/progress-provider";
import { useCourse } from "@/components/learn/course-context";

type Quiz = { prompt: ReactNode; options: ReactNode[]; answer: ReactNode; answerIndex?: number };

/**
 * Single-answer check. Wrong answers shake and can be retried; the right answer
 * locks in and reveals the explanation. `pending` names what is still needed for the badge.
 */
export function QuizCard({
  quest,
  quiz,
  guide,
  onAnswer,
  pending,
}: {
  quest: string;
  quiz: Quiz;
  guide: string;
  onAnswer: (correct: boolean) => void;
  pending?: ReactNode;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [attempt, setAttempt] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rightIndex, setRightIndex] = useState<number | null>(null);
  const { learnerId, addStamp } = useProgress();
  const endpoint = useCourse().certificates?.checkAnswerEndpoint;
  const locked = status === "correct";

  const pick = (i: number) => {
    if (locked) return;
    setSelected(i);
    if (status === "incorrect") setStatus("idle");
  };

  // Graded on the server when the course issues certificates (answers never ship); a right answer returns a signed stamp.
  const submit = async () => {
    if (selected === null || locked || checking) return;
    setChecking(true);
    setError(null);
    try {
      // Courses without certificates ship the answer and grade in the browser.
      if (typeof quiz.answerIndex === "number" || !endpoint) {
        const ok = selected === quiz.answerIndex;
        if (ok) setRightIndex(selected);
        setStatus(ok ? "correct" : "incorrect");
        setAttempt((n) => n + 1);
        onAnswer(ok);
        return;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest, option: selected, learnerId }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { correct: boolean; answerIndex?: number; stamp?: string | null };
      if (data.correct) {
        setRightIndex(data.answerIndex ?? selected);
        addStamp(data.stamp);
      }
      setStatus(data.correct ? "correct" : "incorrect");
      setAttempt((a) => a + 1);
      onAnswer(data.correct);
    } catch {
      setError("We couldn't check your answer. Check your connection and try again.");
    } finally {
      setChecking(false);
    }
  };

  const mood: CritterMood = status === "correct" ? "happy" : status === "incorrect" ? "worried" : "curious";

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--sc-line)] bg-white shadow-[var(--sc-shadow-md)]">
      <div className="flex items-start gap-4 border-b border-[#efebe1] bg-[#fbfaf6] px-6 py-5 sm:px-8">
        <span key={`${status}-${attempt}`} className="shrink-0">
          <CritterIcon type={guide} mood={mood} size={52} />
        </span>
        <div className="sc-prose min-w-0 text-[1.05rem] font-medium leading-relaxed text-[var(--sc-ink)]">{quiz.prompt}</div>
      </div>

      <div className="px-6 py-6 sm:px-8" role="radiogroup" aria-label="Answer options">
        <ul className="grid gap-3">
          {quiz.options.map((option, i) => {
            const isSel = selected === i;
            const isRight = locked && i === rightIndex;
            const isWrong = status === "incorrect" && isSel;
            return (
              <li key={i}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  disabled={locked && !isRight}
                  onClick={() => pick(i)}
                  className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left text-[15px] font-medium transition-all duration-200 ${
                    isRight
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-[0_0_0_4px_rgba(16,185,129,.12)]"
                      : isWrong
                        ? "sc-shake border-rose-400 bg-rose-50 text-rose-950"
                        : isSel
                          ? "border-[var(--sc-ink)] bg-[#faf8f3] text-[var(--sc-ink)] shadow-[var(--sc-shadow-sm)]"
                          : locked
                            ? "border-[#efebe1] bg-white text-[var(--sc-ink-3)] opacity-60"
                            : "border-[var(--sc-line)] bg-white text-[var(--sc-ink-2)] hover:-translate-y-px hover:border-[#cfc8b8] hover:shadow-[var(--sc-shadow-sm)]"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[13px] font-bold transition-colors ${
                      isRight ? "bg-emerald-500 text-white" : isWrong ? "bg-rose-500 text-white" : isSel ? "bg-[var(--sc-ink)] text-white" : "bg-[#f1eee6] text-[var(--sc-ink-3)] group-hover:bg-[#e9e4d8]"
                    }`}
                  >
                    {isRight ? <FiCheck className="sc-pop h-4 w-4" /> : isWrong ? <FiX className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                  </span>
                  <span className="sc-prose min-w-0 text-[15px] leading-snug text-inherit">{stripLetter(option)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={submit}
            disabled={selected === null || locked || checking || status === "incorrect"}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--sc-ink)] px-6 text-sm font-semibold text-white shadow-[var(--sc-shadow-md)] transition hover:-translate-y-px hover:bg-black disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#d8d2c4] disabled:shadow-none"
          >
            {locked ? (
              <>
                <FiCheck /> Answer locked in
              </>
            ) : status === "incorrect" ? (
              <>
                <FiRotateCcw /> Pick another answer
              </>
            ) : (
              <>
                Check answer <FiArrowRight />
              </>
            )}
          </button>
          <p role="status" aria-live="polite" className="text-sm text-[var(--sc-ink-3)]">
            {error && <span className="font-medium text-rose-700">{error}</span>}
            {!error && checking && "Checking…"}
            {status === "incorrect" && <span className="font-medium text-rose-700">Not quite — pick another option and check again.</span>}
            {status === "idle" && selected === null && "Choose one answer."}
          </p>
        </div>

        {locked && (
          <div className="sc-rise mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <FiCheck /> Correct{attempt === 1 ? " on the first try" : ""}.
            </p>
            <div className="sc-prose mt-2 text-[15px] text-emerald-950/80">{quiz.answer}</div>
            {pending && <p className="mt-3 text-sm font-medium text-emerald-900">{pending}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Options are authored as "A) …"; the card renders its own letter chip. */
function stripLetter(option: ReactNode): ReactNode {
  return typeof option === "string" ? option.replace(/^[A-D]\)\s*/, "") : option;
}
