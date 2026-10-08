"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

/** Serializable course summary passed from app/page.tsx (server) to the progress islands. */
export type HomeCourse = {
  id: string;
  name: string;
  storageKey: string;
  quests: { slug: string; title: string; duration: string; region: string; href: string; guide: string; guideName: string }[];
  regions: { name: string; color: string }[];
};

type Snapshot = { course: HomeCourse; done: Set<string> };

function readCompleted(course: HomeCourse): Set<string> {
  try {
    const raw = window.localStorage.getItem(course.storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { completedQuests?: unknown };
    const slugs = new Set(course.quests.map((q) => q.slug));
    return new Set(Array.isArray(parsed.completedQuests) ? parsed.completedQuests.filter((s): s is string => typeof s === "string" && slugs.has(s)) : []);
  } catch {
    return new Set();
  }
}

/** Progress lives in each course's localStorage key (components/learn/progress-provider.tsx). Null until mounted. */
function useHomeProgress(courses: HomeCourse[]) {
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  useEffect(() => {
    const load = () => setSnapshots(courses.map((course) => ({ course, done: readCompleted(course) })));
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [courses]);
  return snapshots;
}

/** The course a returning learner is part-way through (highest completion wins). */
function activeCourse(snapshots: Snapshot[] | null) {
  const inProgress = (snapshots ?? []).filter((s) => s.done.size > 0 && s.done.size < s.course.quests.length);
  inProgress.sort((a, b) => b.done.size / b.course.quests.length - a.done.size / a.course.quests.length);
  const active = inProgress[0];
  if (!active) return null;
  const index = active.course.quests.findIndex((q) => !active.done.has(q.slug));
  return { ...active, next: active.course.quests[index], number: String(index + 1).padStart(2, "0") };
}

const Arrow = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** Header call to action: "Start learning free", or "3/17 quests · Continue" for a returning learner. */
export function NavCta({ courses }: { courses: HomeCourse[] }) {
  const active = activeCourse(useHomeProgress(courses));
  const base = "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--sc-ink)] px-4 text-[13px] font-bold sm:px-5 sm:text-sm text-white shadow-[var(--sc-shadow-md)] transition hover:-translate-y-0.5 hover:bg-black";
  if (active) {
    const pct = active.done.size / active.course.quests.length;
    return (
      <Link href={active.next.href} className={base}>
        <span aria-hidden className="h-[18px] w-[18px] rounded-full" style={{ background: `conic-gradient(var(--sc-accent-2) ${pct * 360}deg, #3a372f 0)`, WebkitMask: "radial-gradient(circle, transparent 5px, #000 5.5px)", mask: "radial-gradient(circle, transparent 5px, #000 5.5px)" }} />
        <span className="hidden sm:inline">
          {active.done.size}/{active.course.quests.length} quests ·
        </span>{" "}
        Continue
      </Link>
    );
  }
  return (
    <a href="#courses" className={base}>
      <span className="hidden sm:inline">Start learning free</span>
      <span className="sm:hidden">Start free</span>
      <Arrow />
    </a>
  );
}

/** "Up next" card on top of the hero course stack. Renders nothing for first-time visitors. */
export function UpNextCard({ courses, critters }: { courses: HomeCourse[]; critters: Record<string, ReactNode> }) {
  const active = activeCourse(useHomeProgress(courses));
  if (!active) return null;
  const { next } = active;
  return (
    <Link
      href={next.href}
      className="sc-rise sc-h-z3 group flex items-center gap-4 rounded-[20px] bg-[var(--sc-ink)] p-4 text-white shadow-[0_6px_0_-1px_#000,0_36px_60px_-20px_rgba(22,20,15,.55)] sm:px-5"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#2a261f] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">{critters[next.guide]}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-[#7fdbca]">Up next · {active.course.name}</span>
        <span className="mt-1 block truncate text-[17px] font-bold">{next.title}</span>
        <span className="mt-0.5 block text-[13px] text-[#b9b4a8]">
          Quest {active.number} · {next.duration} · with {next.guideName}
        </span>
      </span>
      <span className="hidden h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-[var(--sc-ink)] transition group-hover:translate-x-0.5 sm:inline-flex">
        Continue <Arrow className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

/** Per-part progress bars on a hero course card, once the learner has started that course. */
export function CourseBars({ courses, courseId }: { courses: HomeCourse[]; courseId: string }) {
  const snapshots = useHomeProgress(courses);
  const snap = snapshots?.find((s) => s.course.id === courseId);
  if (!snap || snap.done.size === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 text-xs text-[var(--sc-ink-3)]">
      {snap.course.regions.map((region, i) => {
        const inRegion = snap.course.quests.filter((q) => q.region === region.name);
        const done = inRegion.filter((q) => snap.done.has(q.slug)).length;
        return (
          <div key={region.name}>
            <div className="flex justify-between">
              <span>
                Part {i + 1} · {region.name}
              </span>
              <span className="tabular-nums">
                {done}/{inRegion.length}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--sc-paper-2)]">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(done / inRegion.length) * 100}%`, background: region.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
