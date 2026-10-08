"use client";

import { useEffect, useRef, useState } from "react";
import { FiRotateCcw } from "react-icons/fi";
import { availableIn } from "@/lib/learn/courses";
import { useCourse } from "./course-context";
import { useProgress } from "./progress-provider";

export function ProgressRing({ value, size = 22, stroke = 3 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--sc-accent-2)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset .8s var(--sc-ease)" }}
      />
    </svg>
  );
}

export function LearningProgress() {
  const course = useCourse();
  const availableQuests = availableIn(course);
  const { completedQuests, resetProgress } = useProgress();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = availableQuests.length;
  const done = availableQuests.filter((q) => completedQuests.has(q.slug)).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const regions = course.regionOrder.map((r) => {
    const qs = availableQuests.filter((q) => q.region === r);
    return { r, done: qs.filter((q) => completedQuests.has(q.slug)).length, total: qs.length };
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--sc-line)] bg-white pl-1.5 pr-3.5 text-[13px] font-semibold text-[var(--sc-ink)] shadow-[var(--sc-shadow-sm)] transition hover:border-[#d6cfbf]"
      >
        <ProgressRing value={total ? done / total : 0} />
        <span className="tabular-nums">
          {done}/{total}
        </span>
        <span className="hidden font-medium text-[var(--sc-ink-3)] sm:inline">{done === 1 ? "badge" : "badges"}</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Your progress" className="sc-rise absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[var(--sc-line)] bg-white p-4 shadow-[var(--sc-shadow-lg)]">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-ink-3)]">Your progress</p>
          <div className="mt-3 grid gap-3">
            {regions.map(({ r, done: d, total: t }) => (
              <div key={r}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium text-[var(--sc-ink)]">{r}</span>
                  <span className="tabular-nums text-[var(--sc-ink-3)]">
                    {d}/{t}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f1eee6]">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d / t) * 100}%`, background: course.regions[r].color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] leading-snug text-[var(--sc-ink-3)]">Saved in this browser only — no account needed.</p>
          <div className="mt-3 border-t border-[#efebe1] pt-3">
            {confirm ? (
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="text-[var(--sc-ink-2)]">Clear all badges?</span>
                <span className="flex gap-1">
                  <button type="button" className="rounded-lg px-2.5 py-1.5 font-medium text-[var(--sc-ink-2)] hover:bg-[#f6f3ec]" onClick={() => setConfirm(false)}>
                    Keep
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-rose-600 px-2.5 py-1.5 font-semibold text-white hover:bg-rose-700"
                    onClick={() => {
                      resetProgress();
                      setConfirm(false);
                      setOpen(false);
                    }}
                  >
                    Reset
                  </button>
                </span>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--sc-ink-3)] hover:text-rose-700">
                <FiRotateCcw className="h-3.5 w-3.5" /> Reset progress
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
