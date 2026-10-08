"use client";

import { CertificateShelf } from "@/components/certificates/certificate-shelf";
import Link from "next/link";
import { FiArrowRight, FiBookOpen, FiCheck, FiClock, FiCode, FiPlay, FiTarget } from "react-icons/fi";
import { CritterIcon, critterName } from "@/components/dynamodb/scene/critter-svg";
import { availableIn, guideIn, minutes, questHref } from "@/lib/learn/courses";
import { useProgress } from "@/components/learn/progress-provider";
import { ProgressRing } from "@/components/learn/learning-progress";
import { useCourse } from "@/components/learn/course-context";

const CREW = ["Fire", "Water", "Grass", "Electric", "Psychic", "Normal", "Rock", "Flying"];

const HOW_ICONS = [FiBookOpen, FiCode, FiTarget];

/** Course home: hero with the next quest, how it works, and every region's quests. */
export function CourseDashboard() {
  const course = useCourse();
  const REGIONS = course.regions;
  const guideFor = (slug: string) => guideIn(course, slug);
  const { completedQuests, isLoading } = useProgress();
  const available = availableIn(course);
  const doneCount = available.filter((q) => completedQuests.has(q.slug)).length;
  const next = available.find((q) => !completedQuests.has(q.slug)) ?? null;
  const started = doneCount > 0;
  const allDone = available.length > 0 && doneCount === available.length;
  const hours = Math.round((available.reduce((t, q) => t + minutes(q.duration), 0) / 60) * 2) / 2;
  const indexOf = (slug: string) => available.findIndex((q) => q.slug === slug);
  const target = next ?? available[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#111214] text-white">
        <div aria-hidden className="absolute inset-0 opacity-[0.5] [background-image:radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_30%_20%,#000,transparent_70%)]" />
        <div aria-hidden className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#13a58e] opacity-[0.16] blur-[120px]" />
        <div aria-hidden className="absolute -bottom-48 right-0 h-[480px] w-[480px] rounded-full bg-[#4f5bd5] opacity-[0.16] blur-[120px]" />
        <div className="relative mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-center lg:py-24">
          <div className="sc-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2fd3b0] shadow-[0_0_10px_#2fd3b0]" />
              Free interactive course · {available.length} quests · about {hours} hours
            </p>
            <h1 className="mt-6 text-[2.9rem] font-semibold leading-[.98] tracking-[-.045em] sm:text-[4rem]">
              {course.home.headline[0]}
              <br />
              <span className="bg-gradient-to-r from-[#7fe8d2] via-[#a7b4ff] to-[#f0b3a2] bg-clip-text text-transparent">{course.home.headline[1]}</span>
            </h1>
            <p className="mt-6 max-w-xl text-[1.08rem] leading-relaxed text-white/65">
              {course.home.lede}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {target && (
                <Link
                  href={questHref(course, target.slug)}
                  className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-6 text-[15px] font-semibold text-[#111214] shadow-[0_10px_30px_-10px_rgba(255,255,255,.5)] transition hover:-translate-y-px hover:bg-[#e8f7f3]"
                >
                  <FiPlay className="h-4 w-4 fill-current" />
                  {allDone ? "Review from the start" : started ? "Continue learning" : "Start the course"}
                  <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
              <a href={`#${course.regionOrder[0].toLowerCase()}`} className="inline-flex h-12 items-center rounded-full px-5 text-[15px] font-semibold text-white/80 transition hover:bg-white/[0.06] hover:text-white">
                See the syllabus
              </a>
            </div>
            <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/50">
              <span className="inline-flex items-center gap-1.5"><FiCheck className="text-[#2fd3b0]" /> No signup</span>
              <span className="inline-flex items-center gap-1.5"><FiCheck className="text-[#2fd3b0]" /> No AWS account or credentials</span>
              <span className="inline-flex items-center gap-1.5"><FiCheck className="text-[#2fd3b0]" /> Progress saved in your browser</span>
            </p>
          </div>

          {/* Continue card */}
          <div className="sc-rise [animation-delay:120ms]">
            <div className="mb-4 flex items-end justify-center gap-1.5 sm:gap-3" role="img" aria-label="The Data Critters, your guides through the course">
              {CREW.map((type, i) => (
                <span key={type} className="inline-block transition-transform duration-200 hover:-translate-y-2">
                  <span className="sc-crew" style={{ animationDelay: `${200 + i * 70}ms` }}>
                    <CritterIcon type={type} size={40} />
                  </span>
                </span>
              ))}
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-white/45">{allDone ? "Course complete" : started ? "Up next" : "Your first quest"}</p>
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold tabular-nums text-white/80">
                  <ProgressRing value={available.length ? doneCount / available.length : 0} size={20} />
                  {isLoading ? "–" : doneCount}/{available.length}
                </span>
              </div>
              {target && (
                <Link href={questHref(course, target.slug)} className="group mt-4 flex items-center gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.1]">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/[0.08]">
                    <CritterIcon type={guideFor(target.slug)} size={52} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] text-white/50">
                      Quest {String(indexOf(target.slug) + 1).padStart(2, "0")} · {target.duration} · with {critterName(guideFor(target.slug))}
                    </span>
                    <span className="mt-0.5 block text-[17px] font-semibold leading-snug">{target.title}</span>
                  </span>
                  <FiArrowRight className="ml-auto h-5 w-5 shrink-0 text-white/50 transition group-hover:translate-x-1 group-hover:text-white" />
                </Link>
              )}
              <div className="mt-5 grid gap-3">
                {course.regionOrder.map((r) => {
                  const qs = available.filter((q) => q.region === r);
                  const d = qs.filter((q) => completedQuests.has(q.slug)).length;
                  return (
                    <div key={r}>
                      <div className="flex justify-between text-[12.5px]">
                        <span className="text-white/70">
                          {REGIONS[r].part} · {r}
                        </span>
                        <span className="tabular-nums text-white/50">
                          {d}/{qs.length}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d / qs.length) * 100}%`, background: REGIONS[r].color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-label="How each quest works" className="border-b border-[var(--sc-line)]">
        <div className="mx-auto grid max-w-[1180px] gap-px px-4 sm:px-8 md:grid-cols-3">
          {course.home.howItWorks.map(({ title: t, body: d }, i) => {
            const Icon = HOW_ICONS[i % HOW_ICONS.length];
            return (
            <div key={t} className="flex gap-4 py-8 md:px-6 md:first:pl-0 md:last:pr-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--sc-accent)] shadow-[var(--sc-shadow-sm)] ring-1 ring-[var(--sc-line)]">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[var(--sc-ink)]">
                  <span className="mr-1.5 font-mono text-[12px] text-[var(--sc-ink-3)]">0{i + 1}</span>
                  {t}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-[var(--sc-ink-3)]">{d}</p>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* Regions */}
      <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
        {course.regionOrder.map((r) => {
          const region = REGIONS[r];
          const qs = available.filter((q) => q.region === r);
          const d = qs.filter((q) => completedQuests.has(q.slug)).length;
          return (
            <section key={r} id={r.toLowerCase()} aria-labelledby={`${r}-h`} className="scroll-mt-20 pt-20">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={region.badge} alt="" width={72} height={72} className={`h-[72px] w-[72px] drop-shadow-md transition ${d === qs.length ? "" : "opacity-90 grayscale-[.35]"}`} />
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[.16em]" style={{ color: region.ink }}>
                      {region.part} · {r}
                    </p>
                    <h2 id={`${r}-h`} className="mt-1 text-[2rem] font-semibold leading-tight tracking-[-.03em] text-[var(--sc-ink)]">
                      {region.title}
                    </h2>
                  </div>
                </div>
                <div className="max-w-md sm:text-right">
                  <p className="text-[14.5px] leading-relaxed text-[var(--sc-ink-3)]">{region.blurb}</p>
                  <p className="mt-2 text-[13px] font-semibold tabular-nums text-[var(--sc-ink-2)]">
                    {d} of {qs.length} complete
                  </p>
                </div>
              </div>

              <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {qs.map((q) => {
                  const n = indexOf(q.slug) + 1;
                  const done = completedQuests.has(q.slug);
                  const isNext = next?.slug === q.slug;
                  return (
                    <li key={q.slug}>
                      <Link
                        href={questHref(course, q.slug)}
                        className={`group relative flex h-full flex-col rounded-[24px] border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--sc-shadow-lg)] ${
                          isNext
                            ? "border-[var(--sc-accent)] bg-white shadow-[0_0_0_4px_rgba(14,124,107,.1),var(--sc-shadow-md)]"
                            : done
                              ? "border-[var(--sc-line)] bg-[#fbfaf6]"
                              : "border-[var(--sc-line)] bg-white shadow-[var(--sc-shadow-sm)] hover:border-[#d6cfbf]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex items-center gap-3">
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4f1e8] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                              <CritterIcon type={guideFor(q.slug)} mood={done ? "happy" : "idle"} size={40} />
                            </span>
                            <span className="font-mono text-[13px] font-semibold text-[var(--sc-ink-3)]">{String(n).padStart(2, "0")}</span>
                          </span>
                          {done ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                              <FiCheck className="h-3 w-3" /> Done
                            </span>
                          ) : isNext ? (
                            <span className="rounded-full bg-[var(--sc-accent)] px-2.5 py-1 text-[11px] font-semibold text-white">{started ? "Up next" : "Start here"}</span>
                          ) : (
                            <span className="rounded-full border border-[var(--sc-line)] px-2.5 py-1 text-[11px] font-medium text-[var(--sc-ink-3)]">{q.difficulty}</span>
                          )}
                        </div>
                        <h3 className="mt-5 text-[1.15rem] font-semibold leading-snug tracking-[-.015em] text-[var(--sc-ink)]">{q.title}</h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-[var(--sc-ink-3)]">{q.subtitle}</p>
                        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-[12.5px] text-[var(--sc-ink-3)]">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="inline-flex shrink-0 items-center gap-1">
                              <FiClock className="h-3.5 w-3.5" />
                              {q.duration}
                            </span>
                            <span className="truncate">{q.topics[0]}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--sc-ink-2)] transition group-hover:text-[var(--sc-ink)]">
                            {done ? "Review" : "Start"}
                            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
                {qs.length % 3 === 2 && (
                  <li className="hidden lg:block" aria-hidden={d < qs.length}>
                    <div className="grid h-full place-items-center rounded-[24px] border border-dashed border-[#d6cfbf] p-6 text-center">
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={region.badge} alt="" width={88} height={88} className={`mx-auto h-[88px] w-[88px] transition ${d === qs.length ? "sc-pop drop-shadow-lg" : "opacity-40 grayscale"}`} />
                        <p className="mt-4 text-[15px] font-semibold text-[var(--sc-ink)]">{d === qs.length ? `${r} badge earned` : `The ${r} badge`}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--sc-ink-3)]">
                          {d === qs.length ? `${region.title} — complete.` : `Finish all ${qs.length} quests to unlock it · ${qs.length - d} to go`}
                        </p>
                      </div>
                    </div>
                  </li>
                )}
              </ol>
            </section>
          );
        })}

        {course.certificates && <CertificateShelf />}

        <section className="mt-20 grid gap-6 rounded-[28px] border border-[var(--sc-line)] bg-white p-7 shadow-[var(--sc-shadow-sm)] sm:grid-cols-[auto_1fr] sm:items-center sm:p-9">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--sc-accent-soft)]">
            <CritterIcon type={course.home.whyGuide} mood="curious" size={44} />
          </span>
          <div>
            <h2 className="text-[1.25rem] font-semibold tracking-[-.015em] text-[var(--sc-ink)]">Why this order works</h2>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[var(--sc-ink-3)]">
              {course.home.whyOrder}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
