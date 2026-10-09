import type { ReactNode } from "react";
import { REPO_LINKS } from "@/lib/site";

const arrow = <path d="M5 12h14M13 6l6 6-6 6" />;
const external = <path d="M14 4h6v6M20 4l-9 9" />;

function Icon({ d, className = "h-4 w-4" }: { d: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}

const PATHS = [
  {
    tag: "Small",
    title: "Fix a lesson",
    body: "A typo, an unclear sentence, or AWS behaviour that has changed. Fork, fix and open a pull request. No issue needed.",
    cta: "Fork the repo",
    href: REPO_LINKS.fixLesson,
  },
  {
    tag: "Medium",
    title: "Add a quest",
    body: "Write a new quest for DynamoDB, S3 or CDK: the lesson, a practice task and the rule that checks it. Agree the idea in an issue first.",
    cta: "Propose a quest",
    href: REPO_LINKS.questProposal,
  },
  {
    tag: "Large",
    title: "Propose a course",
    body: "Lambda, SQS, Step Functions or any other AWS service. The next course is picked by the people who ask for it, so add a 👍 to an open proposal or start one.",
    cta: "Propose a course",
    href: REPO_LINKS.courseProposal,
    featured: true,
  },
] as const;

const STEPS = [
  ["Propose", "Open a short issue so the idea, the quest’s place in the course and the checker approach are agreed before you build."],
  ["Build", "Clone, run npm ci and npm run dev. No AWS account, credentials or environment variables needed."],
  ["Verify", "Every starter must fail and every solution must pass. CI runs the same checks on your pull request."],
  ["Ship", "Link the AWS doc you checked in the PR. Once reviewed and merged, it goes live for every learner."],
] as const;

export function ContributeSection() {
  return (
    <section id="contribute" className="scroll-mt-20 border-t border-[var(--sc-line)] bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[.16em] text-[var(--sc-accent)]">Open source</p>
            <h2 className="mt-4 max-w-[760px] text-3xl font-bold leading-[1.1] tracking-[-.03em] sm:text-5xl">
              Know an AWS service well?
              <span className="block text-[var(--sc-accent)]">Teach it here.</span>
            </h2>
            <p className="mt-5 max-w-[620px] text-[17px] leading-relaxed text-[var(--sc-ink-2)]">
              Serverless Creed is built in the open and the courses are free. Fix a lesson, write a quest, or propose a whole new course, and learners get it for free.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={REPO_LINKS.repo}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--sc-ink)] px-6 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
            >
              Star &amp; browse on GitHub
              <Icon d={external} />
            </a>
            <a
              href={REPO_LINKS.contributing}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#d6d0c1] bg-white px-5 text-[15px] font-bold text-[var(--sc-ink)] transition hover:-translate-y-0.5 hover:border-[var(--sc-ink)]"
            >
              Contributing guide
            </a>
          </div>
        </div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {PATHS.map((p) => (
            <li key={p.title} className="flex">
              <a
                href={p.href}
                className={`group relative flex w-full flex-col rounded-[22px] border p-6 transition hover:-translate-y-1 hover:shadow-[var(--sc-shadow-lg)] ${
                  "featured" in p
                    ? "border-[var(--sc-ink)] bg-[var(--sc-ink)] text-white"
                    : "border-[var(--sc-line)] bg-[var(--sc-paper)] text-[var(--sc-ink)]"
                }`}
              >
                <span
                  className={`w-fit rounded-full px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[.1em] ${
                    "featured" in p ? "bg-[#13a58e]/25 text-[#7fdbca]" : "bg-[var(--sc-accent-soft)] text-[var(--sc-accent)]"
                  }`}
                >
                  {p.tag}
                </span>
                <h3 className="mt-5 text-2xl font-bold tracking-[-.02em]">{p.title}</h3>
                <p className={`mt-2 flex-1 text-[15px] leading-relaxed ${"featured" in p ? "text-[#c9c4b6]" : "text-[var(--sc-ink-3)]"}`}>{p.body}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-bold">
                  {p.cta}
                  <Icon d={arrow} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            </li>
          ))}
        </ul>

        <ol className="mt-14 grid gap-x-8 gap-y-8 border-t border-[var(--sc-line)] pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="relative">
              <span className="font-mono text-[13px] font-bold text-[var(--sc-accent)]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1 text-lg font-bold">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--sc-ink-3)]">{body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-[15px] text-[var(--sc-ink-3)]">
          Want to see what’s already asked for?{" "}
          <a href={REPO_LINKS.openProposals} className="font-semibold text-[var(--sc-accent)] underline underline-offset-4">
            Browse open issues and course proposals
          </a>{" "}
          or{" "}
          <a href={REPO_LINKS.discussions} className="font-semibold text-[var(--sc-accent)] underline underline-offset-4">
            start a discussion
          </a>
          . New to a quest? Read{" "}
          <a href={REPO_LINKS.questGuide} className="font-semibold text-[var(--sc-accent)] underline underline-offset-4">
            how to write one
          </a>
          .
        </p>
      </div>
    </section>
  );
}
