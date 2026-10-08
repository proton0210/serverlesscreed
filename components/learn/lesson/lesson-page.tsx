"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FiArrowLeft, FiArrowRight, FiBookOpen, FiCheck, FiChevronDown, FiClock, FiCode, FiTarget } from "react-icons/fi";
import type { QuestContent, QuestMeta } from "@/lib/learn/types";
import { closesRegionIn, guideIn, neighboursIn, numberIn, questHref } from "@/lib/learn/courses";
import { quizAttempt, track } from "@/lib/analytics";
import { useProgress } from "@/components/learn/progress-provider";
import { useCourse } from "@/components/learn/course-context";
import { CritterIcon, critterName } from "@/components/dynamodb/scene/critter-svg";
import { LessonSection } from "./lesson-section";
import { QuizCard } from "./quiz-card";
import { BadgeDialog } from "./badge-dialog";
import { nodeText, slugify } from "./node-text";

export type LessonChallenge = {
  /** What the learner must change, shown above the editor. */
  brief: ReactNode;
  render: (onSuccess: () => void) => ReactNode;
};

type OutlineItem = { id: string; label: string; kind: "learn" | "practice" | "check" };

/**
 * The single lesson layout for all quests: hero with the guide critter and mission,
 * a sticky outline, editorial sections, the practice workbench, the check, and the reward.
 */
export function LessonPage({
  meta,
  content,
  challenge,
  heroAction,
}: {
  meta: QuestMeta;
  content: QuestContent;
  challenge?: LessonChallenge;
  /** Extra button beside "Start the lesson" (DynamoDB shows the Pokédex). */
  heroAction?: ReactNode;
}) {
  const course = useCourse();
  const { completeQuest, completedQuests } = useProgress();
  const { prev, next } = neighboursIn(course, meta.slug);
  const region = course.regions[meta.region];
  const guide = guideIn(course, meta.slug);
  const number = numberIn(course, meta.slug);
  const alreadyDone = completedQuests.has(meta.slug);

  const [codeDone, setCodeDone] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [earned, setEarned] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    track("quest_view", { quest: meta.slug });
  }, [meta.slug]);

  const outline = useMemo<OutlineItem[]>(() => {
    const seen = new Set<string>();
    const items: OutlineItem[] = content.sections.map((s) => {
      const label = s.label || nodeText(s.title).trim() || "Section";
      let id = slugify(label);
      while (seen.has(id)) id += "-x";
      seen.add(id);
      return { id, label, kind: "learn" };
    });
    if (challenge) items.push({ id: "practice", label: "Your turn", kind: "practice" });
    items.push({ id: "check", label: "Check your understanding", kind: "check" });
    return items;
  }, [content.sections, challenge]);

  const active = useActiveSection(outline.map((o) => o.id));
  const [readAll, setReadAll] = useState(false);
  useEffect(() => {
    if (active === "practice" || active === "check") setReadAll(true);
  }, [active]);

  const finish = useCallback(
    async (code: boolean, quiz: boolean) => {
      if (!quiz || (challenge && !code) || earned) return;
      const first = !completedQuests.has(meta.slug);
      setEarned(true);
      await completeQuest(meta.slug, course.badgeId(meta.slug, Boolean(challenge)));
      if (first) track("quest_complete", { quest: meta.slug });
      setCelebrate(first);
      setDialog(true);
    },
    [challenge, completeQuest, completedQuests, course, earned, meta.slug]
  );

  const onCode = useCallback(() => {
    setCodeDone(true);
    void finish(true, quizDone);
  }, [finish, quizDone]);

  const onAnswer = (correct: boolean) => {
    track("quiz_answer", { quest: meta.slug, correct, attempt: quizAttempt(`${course.id}:${meta.slug}`) });
    if (!correct) return;
    setQuizDone(true);
    void finish(codeDone, true);
  };

  const steps = [
    { label: "Learn", icon: FiBookOpen, done: readAll || quizDone || codeDone || alreadyDone, href: `#${outline[0]?.id}` },
    ...(challenge ? [{ label: "Practice", icon: FiCode, done: codeDone || alreadyDone, href: "#practice" }] : []),
    { label: "Check", icon: FiTarget, done: quizDone || alreadyDone, href: "#check" },
  ];

  const pending = challenge && !codeDone ? "One more step: pass the code challenge above to earn the badge." : undefined;

  return (
    <div className="relative">
      <ReadingProgress />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-[var(--sc-line)]">
        <div aria-hidden className="sc-grain absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
        <div aria-hidden className="absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full opacity-[0.13] blur-3xl" style={{ background: region.color }} />
        <div className="relative mx-auto max-w-[1180px] px-4 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--sc-ink-3)]">
            <Link href={course.basePath} className="inline-flex items-center gap-1.5 font-medium transition hover:text-[var(--sc-ink)]">
              <FiArrowLeft className="h-3.5 w-3.5" /> All quests
            </Link>
            <span aria-hidden className="text-[#c9c2b2]">/</span>
            <Link href={`${course.basePath}#${meta.region.toLowerCase()}`} className="transition hover:text-[var(--sc-ink)]">
              {region.part} · {meta.region}
            </Link>
          </nav>

          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-end gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="sc-rise">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--sc-line)] bg-white/80 px-3 py-1 text-[12px] font-semibold text-[var(--sc-ink-2)] shadow-[var(--sc-shadow-sm)] backdrop-blur">
                  <span className="h-2 w-2 rounded-full" style={{ background: region.color }} />
                  Quest {number}
                </span>
                <span className="rounded-full border border-[var(--sc-line)] bg-white/60 px-3 py-1 text-[12px] font-medium text-[var(--sc-ink-3)]">{meta.difficulty}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--sc-line)] bg-white/60 px-3 py-1 text-[12px] font-medium text-[var(--sc-ink-3)]">
                  <FiClock className="h-3 w-3" />
                  {meta.duration}
                </span>
                {(alreadyDone || earned) && (
                  <span className="sc-pop inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[12px] font-semibold text-white">
                    <FiCheck className="h-3 w-3" /> Completed
                  </span>
                )}
              </div>
              <h1 className="mt-5 max-w-3xl text-[2.35rem] font-semibold leading-[1.05] tracking-[-.035em] text-[var(--sc-ink)] sm:text-[3.25rem]">{meta.title}</h1>
              <div className="sc-prose mt-5 max-w-2xl text-[1.1rem] sm:text-[1.15rem]">{content.intro}</div>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={`#${outline[0]?.id}`}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--sc-ink)] px-6 text-sm font-semibold text-white shadow-[var(--sc-shadow-md)] transition hover:-translate-y-px hover:bg-black"
                >
                  {alreadyDone ? "Review the lesson" : "Start the lesson"} <FiArrowRight />
                </a>
                {heroAction}
              </div>
            </div>

            {/* Guide + mission */}
            <aside aria-label="Your mission" className="sc-rise rounded-[26px] border border-[var(--sc-line)] bg-white/85 p-5 shadow-[var(--sc-shadow-md)] backdrop-blur [animation-delay:120ms]">
              <div className="flex items-center gap-4">
                <span className="sc-float grid h-[72px] w-[72px] shrink-0 place-items-center rounded-2xl bg-[#f4f1e8]">
                  <CritterIcon type={guide} mood={earned ? "happy" : "idle"} size={60} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-ink-3)]">Your guide</p>
                  <p className="text-[15px] font-semibold text-[var(--sc-ink)]">{critterName(guide)}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-[var(--sc-ink-3)]">{meta.topics.join(" · ")}</p>
                </div>
              </div>
              <ol className="mt-5 grid gap-2">
                {steps.map((s, i) => (
                  <li key={s.label}>
                    <a href={s.href} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition hover:bg-[#f6f3ec]">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold transition-colors ${
                          s.done ? "bg-emerald-600 text-white" : "bg-[#f1eee6] text-[var(--sc-ink-3)]"
                        }`}
                      >
                        {s.done ? <FiCheck className="sc-pop h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className={s.done ? "font-medium text-[var(--sc-ink)]" : "text-[var(--sc-ink-2)]"}>{s.label}</span>
                      <s.icon aria-hidden className="ml-auto h-4 w-4 text-[#b9b2a2]" />
                    </a>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-[#efebe1] pt-3 text-[12.5px] leading-snug text-[var(--sc-ink-3)]">
                {challenge ? "Pass the code challenge and the check to earn the badge." : "Answer the check at the end to earn the badge."}
              </p>
            </aside>
          </div>
        </div>
      </header>

      {/* Mobile outline */}
      <MobileOutline items={outline} active={active} />

      <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-12 px-4 py-12 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-16 lg:py-16">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-ink-3)]">On this page</p>
            <ol className="relative mt-4 grid gap-0.5 border-l border-[var(--sc-line)]">
              {outline.map((o) => {
                const on = active === o.id;
                return (
                  <li key={o.id}>
                    <a
                      href={`#${o.id}`}
                      aria-current={on ? "location" : undefined}
                      className={`-ml-px block border-l-2 py-1.5 pl-4 text-[13.5px] leading-snug transition-colors ${
                        on ? "border-[var(--sc-accent)] font-medium text-[var(--sc-ink)]" : "border-transparent text-[var(--sc-ink-3)] hover:text-[var(--sc-ink)]"
                      }`}
                    >
                      {o.kind === "practice" && <FiCode aria-hidden className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px" />}
                      {o.kind === "check" && <FiTarget aria-hidden className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px" />}
                      {o.label}
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>

        <main id="lesson" className="min-w-0 max-w-[780px]">
          {/* What you'll learn */}
          <section aria-label="What you'll learn" className="rounded-[24px] border border-[var(--sc-line)] bg-white p-6 shadow-[var(--sc-shadow-sm)] sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-accent)]">What you&apos;ll learn</p>
            <ul className="mt-4 grid gap-3">
              {content.keyTakeaways.map((t, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-[var(--sc-ink-2)]">
                  <span className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--sc-accent-soft)] text-[var(--sc-accent)]">
                    <FiCheck className="h-3 w-3" />
                  </span>
                  <span className="sc-prose text-[15px] leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-20">
            {content.sections.map((s, i) => (
              <LessonSection key={outline[i].id} id={outline[i].id} index={i} section={s} />
            ))}
          </div>

          {challenge && (
            <section id="practice" aria-labelledby="practice-h" className="mt-24 scroll-mt-28">
              <StageHeader kicker="Practice" icon={FiCode} title="Your turn" id="practice-h" done={codeDone} />
              <div className="sc-prose mt-4">{challenge.brief}</div>
              <div className="mt-7">{challenge.render(onCode)}</div>
            </section>
          )}

          <section id="check" aria-labelledby="check-h" className="mt-24 scroll-mt-28">
            <StageHeader kicker="Check" icon={FiTarget} title="Check your understanding" id="check-h" done={quizDone} />
            <p className="mt-3 text-[15px] text-[var(--sc-ink-3)]">Quick Quiz · one question, as many tries as you need.</p>
            <div className="mt-7">
              <QuizCard quest={meta.slug} quiz={content.quiz} guide={guide} onAnswer={onAnswer} pending={pending} />
            </div>
          </section>

          {(earned || alreadyDone) && (
            <button
              type="button"
              onClick={() => setDialog(true)}
              className="sc-rise mt-10 flex w-full items-center gap-4 rounded-[24px] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 text-left transition hover:shadow-[var(--sc-shadow-md)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={region.badge} alt="" width={56} height={56} className="h-14 w-14" />
              <span>
                <span className="block text-[15px] font-semibold text-emerald-950">Quest complete</span>
                <span className="block text-sm text-emerald-900/70">View your badge and share it.</span>
              </span>
              <FiArrowRight className="ml-auto h-5 w-5 text-emerald-800" />
            </button>
          )}

          <nav aria-label="Quest navigation" className="mt-16 grid gap-3 border-t border-[var(--sc-line)] pt-8 sm:grid-cols-2">
            {prev ? <NavCard quest={prev} dir="prev" /> : <span />}
            {next ? (
              <NavCard quest={next} dir="next" />
            ) : (
              <Link href={course.basePath} className="group rounded-2xl border border-[var(--sc-line)] bg-white p-5 text-right transition hover:-translate-y-0.5 hover:shadow-[var(--sc-shadow-md)]">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">Finish</span>
                <span className="mt-1 block font-semibold text-[var(--sc-ink)]">Back to your course map</span>
              </Link>
            )}
          </nav>
        </main>
      </div>

      <BadgeDialog
        meta={meta}
        open={dialog}
        celebrate={celebrate}
        regionDone={closesRegionIn(course, meta)}
        next={next}
        onClose={() => {
          setDialog(false);
          setCelebrate(false);
        }}
        onCelebrated={() => setCelebrate(false)}
      />
    </div>
  );
}

function StageHeader({ kicker, title, icon: Icon, id, done }: { kicker: string; title: string; icon: typeof FiCode; id: string; done: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[var(--sc-line)] pb-5">
      <div>
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--sc-accent)]">
          <Icon aria-hidden className="h-3.5 w-3.5" /> {kicker}
        </p>
        <h2 id={id} className="mt-2 text-[1.9rem] font-semibold leading-tight tracking-[-.025em] text-[var(--sc-ink)]">
          {title}
        </h2>
      </div>
      {done && (
        <span className="sc-pop inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
          <FiCheck className="h-3.5 w-3.5" /> Done
        </span>
      )}
    </div>
  );
}

function NavCard({ quest, dir }: { quest: QuestMeta; dir: "prev" | "next" }) {
  const course = useCourse();
  const next = dir === "next";
  return (
    <Link
      href={questHref(course, quest.slug)}
      className={`group rounded-2xl border border-[var(--sc-line)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#d6cfbf] hover:shadow-[var(--sc-shadow-md)] ${next ? "text-right sm:col-start-2" : ""}`}
    >
      <span className={`flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)] ${next ? "justify-end" : ""}`}>
        {!next && <FiArrowLeft className="transition-transform group-hover:-translate-x-0.5" />}
        {next ? "Next quest" : "Previous"}
        {next && <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />}
      </span>
      <span className="mt-1 block font-semibold leading-snug text-[var(--sc-ink)]">{quest.title}</span>
    </Link>
  );
}

function MobileOutline({ items, active }: { items: OutlineItem[]; active: string | null }) {
  const [open, setOpen] = useState(false);
  const current = items.find((i) => i.id === active) ?? items[0];
  const index = Math.max(0, items.findIndex((i) => i.id === current?.id));
  return (
    <div className="sticky top-16 z-30 border-b border-[var(--sc-line)] bg-[var(--sc-paper)]/[.95] backdrop-blur-md lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-4 py-3 text-left text-sm sm:px-8"
      >
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[var(--sc-ink)] px-1.5 text-[11px] font-bold text-white">
          {index + 1}/{items.length}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--sc-ink)]">{current?.label}</span>
        <FiChevronDown className={`h-4 w-4 text-[var(--sc-ink-3)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="mx-auto max-w-[1180px] px-4 pb-3 sm:px-8">
          {items.map((o, i) => (
            <li key={o.id}>
              <a
                href={`#${o.id}`}
                onClick={() => setOpen(false)}
                className={`flex gap-3 rounded-lg px-2 py-2 text-sm ${o.id === current?.id ? "bg-white font-medium text-[var(--sc-ink)]" : "text-[var(--sc-ink-2)]"}`}
              >
                <span className="w-5 text-right font-mono text-[12px] text-[var(--sc-ink-3)]">{i + 1}</span>
                {o.label}
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[55] h-[3px]">
      <div className="h-full origin-left bg-gradient-to-r from-[var(--sc-accent)] to-[var(--sc-accent-2)]" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

/** The id of the section nearest the top of the viewport. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");
  useEffect(() => {
    const list = key.split("|");
    let raf = 0;
    const update = () => {
      raf = 0;
      let current: string | null = null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 220) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [key]);
  return active;
}
