import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { COURSES, availableIn, guideIn, minutes, questHref } from "@/lib/learn/courses";
import type { CourseConfig } from "@/lib/learn/types";
import { TIERS } from "@/lib/certificates/tiers";
import { CritterIcon, critterName } from "@/components/dynamodb/scene/critter-svg";
import { LambdaMark, Logo } from "@/components/brand/logo";
import { REPO_URL } from "@/lib/site";
import { ContributeSection } from "@/components/home/contribute";
import { OpenSourceSection } from "@/components/home/open-source";
import { CourseBars, NavCta, UpNextCard, type HomeCourse } from "@/components/home/home-progress";

export const metadata: Metadata = {
  metadataBase: new URL("https://serverlesscreed.com"),
  title: { absolute: "Serverless Creed — Learn AWS by doing. Then do it faster." },
  description:
    "Free, hands-on courses for Amazon DynamoDB, Amazon S3 and the AWS CDK: write real AWS SDK v3 and CDK code (TypeScript or Python) against a simulated service and earn a verifiable certificate. Then work faster with Tables and Buckets, desktop clients for the same services.",
  alternates: { canonical: "/" },
};

const FOUNDER_EMAIL = "vidit@serverlesscreed.com";
const COURSE_LIST: CourseConfig[] = [COURSES.dynamodb, COURSES.s3, COURSES.cdk];
const CRITTER_TYPES = ["Fire", "Water", "Grass", "Electric", "Psychic", "Normal", "Rock", "Flying"];

const COURSE_COPY: Record<string, { eyebrow: string; path: string; pair?: string }> = {
  dynamodb: { eyebrow: "Amazon DynamoDB", path: "Keys → transactions → production", pair: "Tables" },
  s3: { eyebrow: "Amazon S3", path: "Buckets → presigned URLs → events", pair: "Buckets" },
  cdk: { eyebrow: "AWS CDK", path: "Constructs → grants → tested stacks" },
};

const PRODUCTS = [
  {
    name: "Tables",
    service: "Amazon DynamoDB",
    course: "Learn DynamoDB",
    tone: "bg-[rgba(217,87,59,.16)] text-[#f4a48f]",
    icon: "/branding/serverless-tables/desktop-icon-256.png",
    description:
      "Manage tables, items and workloads from one cross-platform app. Tables discovers your AWS profiles, surfaces metrics, and helps you query, edit and automate DynamoDB work.",
    features: ["Tables and indexes", "Item workflows", "AWS profile discovery"],
    storeHref: "https://apps.microsoft.com/detail/9P6V6KW3QKN7",
    websiteHref: "https://tables.serverlesscreed.com/",
  },
  {
    name: "Buckets",
    service: "Amazon S3",
    course: "Learn S3",
    tone: "bg-[rgba(31,157,107,.18)] text-[#7fd8b1]",
    icon: "/branding/serverless-buckets/desktop-icon-256.png",
    description: "A focused desktop app for Amazon S3 on macOS, Windows and Linux — built for developers who work with object storage every day.",
    features: ["Buckets at a glance", "Fast object workflows", "macOS · Windows · Linux"],
    storeHref: "https://apps.microsoft.com/detail/9N62S7QSHBDN",
    websiteHref: "https://buckets.serverlesscreed.com/",
  },
];

const PRINCIPLES = [
  ["One topic at a time", "Every course and every tool goes deep on a single AWS service or tool, so the interface and the lessons stay clear."],
  ["Real code from the first quest", "You write real AWS SDK v3 and CDK code, not multiple-choice guesses. What you practise is what you ship."],
  ["Nothing between you and learning", "No signup, no credit card, no AWS account. Open a quest and start."],
];

/* ── helpers ─────────────────────────────────────────────────────────────── */

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

function Icon({ d, className = "h-4 w-4" }: { d: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}
const arrow = <path d="M5 12h14M13 6l6 6-6 6" />;
const check = <path d="M5 12.5l4.5 4.5L19 7.5" />;
const external = <path d="M14 4h6v6M20 4l-9 9" />;
const shield = (
  <>
    <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </>
);
const mail = (
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>
);

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`text-[13px] font-bold uppercase tracking-[.16em] ${dark ? "text-[#7fdbca]" : "text-[var(--sc-accent)]"}`}>{children}</p>;
}

const btnDark =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--sc-ink)] px-6 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-black";
const btnLight =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#d6d0c1] bg-white px-5 text-[15px] font-bold text-[var(--sc-ink)] transition hover:-translate-y-0.5 hover:border-[var(--sc-ink)]";

function badgePair(course: CourseConfig, size: string, overlap: string, extra = "") {
  return course.regionOrder.map((r, i) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={r}
      src={course.regions[r].badge}
      alt={`${r} badge`}
      className={`${size} ${i ? overlap : ""} ${extra}`}
      style={i ? delay(-1.7) : undefined}
    />
  ));
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function Home() {
  const courses = COURSE_LIST.map((course) => {
    const quests = availableIn(course);
    return { course, quests, total: quests.reduce((sum, q) => sum + minutes(q.duration), 0) };
  });
  const questCount = courses.reduce((n, c) => n + c.quests.length, 0);
  const hours = Math.floor(courses.reduce((n, c) => n + c.total, 0) / 60);
  const tiers = Object.values(TIERS);

  const homeCourses: HomeCourse[] = courses.map(({ course, quests }) => ({
    id: course.id,
    name: course.name,
    storageKey: course.storageKey,
    regions: course.regionOrder.map((name) => ({ name, color: course.regions[name].color })),
    quests: quests.map((q) => ({
      slug: q.slug,
      title: q.title,
      duration: q.duration,
      region: q.region,
      href: questHref(course, q.slug),
      guide: guideIn(course, q.slug),
      guideName: critterName(guideIn(course, q.slug)),
    })),
  }));
  const critters = Object.fromEntries(CRITTER_TYPES.map((t) => [t, <CritterIcon key={t} type={t} size={44} />]));
  const aboutHours = (min: number) => `about ${Math.round((min / 60) * 2) / 2} hours`;

  return (
    <main className="sc-app min-h-screen overflow-x-clip">
      <a href="#courses" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
        Skip to courses
      </a>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-[var(--sc-line)]/80 bg-[var(--sc-paper)]/[.92] backdrop-blur-xl backdrop-saturate-150">
        <nav aria-label="Primary" className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="Serverless Creed home" className="text-[var(--sc-ink)]">
            <Logo markClassName="h-7 w-auto sm:h-[30px]" wordmarkClassName="text-[15px] sm:text-[18px]" />
          </Link>
          <div className="hidden items-center gap-6 whitespace-nowrap text-[15px] font-semibold text-[var(--sc-ink-2)] lg:flex xl:gap-7">
            <a href="#courses" className="transition hover:text-[var(--sc-ink)]">Courses</a>
            <a href="#certificates" className="hidden transition xl:inline hover:text-[var(--sc-ink)]">Certificates</a>
            <a href="#tools" className="transition hover:text-[var(--sc-ink)]">Tools</a>
            <a href="#about" className="hidden transition xl:inline hover:text-[var(--sc-ink)]">About</a>
            <a href="#open-source" className="transition hover:text-[var(--sc-ink)]">Open source</a>
            <a href="#contribute" className="transition hover:text-[var(--sc-ink)]">Contribute</a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`mailto:${FOUNDER_EMAIL}?subject=Hello%20from%20serverlesscreed.com`}
              aria-label="Email the founder"
              title="Email the founder"
              className="hidden h-11 w-11 place-items-center rounded-full border border-[var(--sc-line)] bg-white text-[var(--sc-ink)] transition hover:-translate-y-0.5 sm:grid"
            >
              <Icon d={mail} className="h-[18px] w-[18px]" />
            </a>
            <NavCta courses={homeCourses} />
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="sc-grain relative isolate overflow-hidden border-b border-[var(--sc-line)]">
        <span aria-hidden className="sc-h-glow right-[5%] top-10 h-[560px] w-[560px] bg-[radial-gradient(closest-side,rgba(19,165,142,.2),transparent)]" />
        <span aria-hidden className="sc-h-glow -bottom-32 right-[30%] h-[420px] w-[420px] bg-[radial-gradient(closest-side,rgba(79,91,213,.12),transparent)]" style={delay(-6)} />
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-14 lg:pb-24 lg:pt-20">
          <div className="flex flex-col items-start">
            <p className="sc-rise inline-flex items-center gap-2 rounded-full border border-[var(--sc-line)] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[var(--sc-ink-2)]">
              <span className="sc-h-pulse h-[7px] w-[7px] rounded-full bg-[var(--sc-accent-2)]" />
              Free interactive AWS courses · {courses.length} services · {questCount} quests
            </p>
            <h1 className="sc-rise mt-7 text-[46px] font-extrabold leading-[.98] tracking-[-.045em] sm:text-[64px] xl:text-[80px]" style={delay(0.08)}>
              Learn AWS
              <br className="hidden sm:block" /> by doing.
              <br />
              <span className="text-[var(--sc-accent)]">Then do it faster.</span>
            </h1>
            <p className="sc-rise mt-7 max-w-[560px] text-[17px] leading-relaxed text-[var(--sc-ink-2)] sm:text-xl sm:leading-[1.6]" style={delay(0.18)}>
              Hands-on courses for Amazon DynamoDB, Amazon S3 and the AWS CDK. Write real SDK and CDK code (TypeScript or Python) against a simulated service, watch every request play out, and earn a certificate anyone can verify.
            </p>
            <div className="sc-rise mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={delay(0.28)}>
              <a href="#courses" className={`${btnDark} h-14 px-7 text-base shadow-[0_2px_4px_rgba(22,20,15,.06),0_18px_36px_-14px_rgba(22,20,15,.45)]`}>
                <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5">
                  <path d="M7 4v16l13-8z" fill="currentColor" />
                </svg>
                Pick a course
              </a>
              <a href="#how" className={`${btnLight} h-14 px-6 text-base`}>
                See a quest in action
              </a>
            </div>
            <ul className="sc-rise mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--sc-ink-3)]" style={delay(0.38)}>
              {["No signup", "No AWS account or credentials", "Progress saved in your browser"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Icon d={check} className="h-[15px] w-[15px] text-[var(--sc-accent)]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Course picker — a 3D stack on large screens */}
          <div className="sc-rise sc-h-stage relative isolate lg:h-[540px]" style={delay(0.22)}>
            <div aria-hidden className="sc-h-floor" />
            <div className="sc-h-tilt flex h-full flex-col justify-center gap-4">
              <div aria-hidden className="sc-h-z2 flex justify-between px-3 sm:px-5">
                {CRITTER_TYPES.map((t, i) => (
                  <span key={t} className="sc-h-bob" style={delay(-i * 0.4)}>
                    <CritterIcon type={t} size={40} />
                  </span>
                ))}
              </div>
              <UpNextCard courses={homeCourses} critters={critters} />
              {courses.map(({ course, quests, total }, i) => (
                <a
                  key={course.id}
                  href={`#course-${course.id}`}
                  className={`${i === 0 ? "sc-h-z1" : "sc-h-z0"} group flex flex-col gap-4 rounded-[20px] border border-[var(--sc-line)] bg-gradient-to-b from-white to-[#fbfaf6] p-5 shadow-[inset_0_1px_0_#fff,0_7px_0_-1px_#e4dfd2,0_32px_52px_-24px_rgba(22,20,15,.36)] sm:p-6`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex shrink-0 [perspective:400px]">{badgePair(course, "h-10 w-10 sm:h-[50px] sm:w-[50px] drop-shadow-[0_6px_6px_rgba(22,20,15,.25)]", "-ml-3 sm:-ml-3.5")}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--sc-ink-3)] sm:text-xs">{COURSE_COPY[course.id].eyebrow}</p>
                      <p className="mt-0.5 text-base font-extrabold leading-snug tracking-[-.02em] sm:text-[21px]">{course.home.headline.join(" ")}</p>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--sc-ink)] text-white transition group-hover:translate-x-0.5">
                      <Icon d={arrow} />
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[13px] font-semibold text-[var(--sc-ink-2)]">
                    <span className="rounded-full bg-[#f1eee6] px-2.5 py-1">{quests.length} quests</span>
                    <span className="rounded-full bg-[#f1eee6] px-2.5 py-1">{aboutHours(total)}</span>
                    <span className="hidden rounded-full bg-[#f1eee6] px-2.5 py-1 sm:inline">{COURSE_COPY[course.id].path}</span>
                  </div>
                  <CourseBars courses={homeCourses} courseId={course.id} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── At a glance ── */}
      <section aria-label="At a glance" className="border-b border-[var(--sc-line)] bg-white">
        <dl className="mx-auto grid max-w-[1200px] grid-cols-2 px-5 sm:px-8 md:grid-cols-5">
          {[
            [String(courses.length), "courses, taught deeply"],
            [String(questCount), "hands-on quests"],
            [`${hours}+ h`, "of guided practice"],
            [String(tiers.length), "verifiable certificates"],
            ["$0", "no signup, card or AWS bill"],
          ].map(([value, label], i) => (
            <div key={label} className={`py-6 md:py-8 ${i ? "md:border-l md:pl-8" : ""} ${i % 2 ? "border-l pl-5 md:pl-8" : ""} ${i < 4 ? "border-b md:border-b-0" : "col-span-2 md:col-span-1"} border-[var(--sc-line)]`}>
              <dd className={`text-[32px] font-extrabold tracking-[-.03em] md:text-[40px] ${i === 4 ? "text-[var(--sc-accent)]" : ""}`}>{value}</dd>
              <dt className="mt-1 text-sm text-[var(--sc-ink-3)]">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── How a quest works ── */}
      <section id="how" className="mx-auto grid max-w-[1200px] items-center gap-16 px-5 py-20 sm:px-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-20 lg:py-28">
        <div>
          <Eyebrow>How a quest works</Eyebrow>
          <h2 className="mt-3.5 text-[34px] font-extrabold leading-[1.05] tracking-[-.035em] sm:text-5xl">Fifteen minutes of doing, not watching.</h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--sc-ink-2)]">Every quest is a small Pokédex problem with one AWS concept at its heart. A Data Critter guides you through it.</p>
          <ol className="mt-9 grid gap-6">
            {[
              [<path key="b" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM4 5.5v16" />, "Learn by watching it happen", "Animated scenes show each request travel to its partition or prefix — and what breaks without the right pattern."],
              [<path key="c" d="M8 7l-5 5 5 5M16 7l5 5-5 5" />, "Practice with real code", "Write AWS SDK v3 code, or AWS CDK in TypeScript or Python. A simulator checks it and answers the way the real service or tool would."],
              [
                <g key="t">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" />
                </g>,
                "Check it and collect the badge",
                "One question per quest. Get it right and the badge is yours — badges add up to certificates.",
              ],
            ].map(([icon, title, body]) => (
              <li key={title as string} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--sc-accent-soft)] text-[var(--sc-accent)]">
                  <Icon d={icon} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[var(--sc-ink-3)]">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Workbench */}
        <div className="relative isolate [perspective:1800px]" aria-label="Example: a GetItem challenge in the simulated DynamoDB workbench" role="img">
          <div aria-hidden className="sc-h-window-back absolute inset-[26px_-18px_-26px_30px] -z-10 hidden rounded-[22px] bg-[#e8e3d6] shadow-[0_30px_60px_-30px_rgba(22,20,15,.3)] lg:block" />
          <div aria-hidden className="sc-h-window overflow-hidden rounded-[22px] bg-[var(--sc-code-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_2px_4px_rgba(22,20,15,.08),0_50px_80px_-30px_rgba(22,20,15,.55),0_18px_30px_-18px_rgba(22,20,15,.35)]">
            <div className="flex h-12 items-center gap-2.5 border-b border-[#262a33] bg-[#181b21] px-4">
              <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
              <span className="ml-3 hidden font-mono text-[13px] text-[#a0a8b6] sm:inline">quest-04 · get-starter.js</span>
              <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[rgba(127,219,202,.1)] px-2.5 py-1 text-xs font-semibold text-[#7fdbca]">
                <span className="sc-h-pulse h-1.5 w-1.5 rounded-full bg-[var(--sc-accent-2)]" />
                Simulated DynamoDB
              </span>
            </div>
            <pre className="sc-code overflow-x-auto px-5 py-5 sm:px-6 sm:text-[14px]">
              <span className="t-k">const</span> {"{ "}
              <span className="t-p">Item</span>
              {" } = "}
              <span className="t-k">await</span> client.<span className="t-f">send</span>
              {"(\n  "}
              <span className="t-k">new</span> <span className="t-b">GetItemCommand</span>
              {"({\n    TableName: "}
              <span className="t-s">&quot;Pokedex&quot;</span>
              {",\n    Key: { Name: { S: "}
              <span className="t-s">&quot;Bulbasaur&quot;</span>
              {" } },\n  })\n);"}
              <span className="sc-h-caret" />
            </pre>
            <div className="flex items-center gap-3 border-t border-[#262a33] bg-[#13151a] px-5 py-4 sm:px-6">
              <span className="flex h-[34px] items-center rounded-[10px] bg-[#1f242d] px-3 font-mono text-xs font-semibold text-[#d7dae0]">client</span>
              <div className="relative flex h-[34px] flex-1 flex-col justify-center">
                <span className="block h-0.5 bg-[repeating-linear-gradient(90deg,#3a3f4b_0_6px,transparent_6px_12px)]" />
                <span className="sc-h-packet top-[10px] h-3.5 w-3.5 rounded-full bg-[#7fdbca] shadow-[0_0_14px_3px_rgba(127,219,202,.55)]" />
                <span className="absolute inset-x-0 top-[30px] hidden text-center font-mono text-[11px] text-[#6b7280] sm:block">hash(&quot;Bulbasaur&quot;) → P2</span>
              </div>
              {["P1", "P2", "P3"].map((p) => (
                <span key={p} className={`grid h-[34px] w-11 place-items-center rounded-[10px] font-mono text-xs font-bold sm:w-[58px] ${p === "P2" ? "sc-h-hit" : "bg-[#1f242d] text-[#a0a8b6]"}`}>
                  {p}
                </span>
              ))}
            </div>
            <div className="grid gap-3 border-t border-[#262a33] px-5 pb-5 pt-4 sm:px-6">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                <span className="flex items-center gap-1.5 font-bold text-[#7fdbca]">
                  <Icon d={check} className="h-[15px] w-[15px]" />
                  Challenge passed
                </span>
                <span className="text-[#a0a8b6]">1 item · one partition read, no Scan</span>
              </p>
              <p className="sc-code overflow-x-auto whitespace-pre text-[13px] text-[#a0a8b6]">
                {"{ Name: "}
                <span className="t-s">&quot;Bulbasaur&quot;</span>, Type1: <span className="t-s">&quot;grass&quot;</span>, Type2: <span className="t-s">&quot;poison&quot;</span>
                {" }"}
              </p>
            </div>
          </div>
          <div className="sc-h-bob mt-5 flex items-end gap-2.5 lg:absolute lg:-bottom-20 lg:-left-11 lg:mt-0" style={{ animationDuration: "5s" }}>
            <span className="sc-h-depth grid h-[72px] w-[72px] place-items-center rounded-[20px] border border-[var(--sc-line)] bg-white">
              <CritterIcon type="Grass" size={56} />
            </span>
            <span className="sc-h-depth max-w-[250px] rounded-2xl rounded-bl-md border border-[var(--sc-line)] bg-white px-4 py-3 text-sm leading-normal text-[var(--sc-ink-2)]">
              <b className="text-[var(--sc-ink)]">Sprig:</b> The full key goes straight to one item. No need to read the whole table.
            </span>
          </div>
          <div className="sc-h-bob sc-h-depth absolute -right-2 top-24 hidden items-center gap-2.5 rounded-full border border-[var(--sc-line)] bg-white py-2 pl-2 pr-4 sm:flex lg:-right-8" style={{ animationDuration: "4.2s", animationDelay: "-1.5s" }}>
            <span className="flex [perspective:300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={COURSES.dynamodb.regions.Kanto.badge} alt="" className="sc-h-coin h-11 w-11" />
            </span>
            <span>
              <span className="block text-xs text-[var(--sc-ink-3)]">Badge earned</span>
              <span className="block text-sm font-bold">Quest 04 · Kanto</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Courses ── */}
      <section id="courses" className="scroll-mt-20 border-t border-[var(--sc-line)] bg-[var(--sc-paper-2)]">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <Eyebrow>Courses</Eyebrow>
              <h2 className="mt-3.5 max-w-[720px] text-[34px] font-extrabold leading-[1.05] tracking-[-.035em] sm:text-5xl">Start with the service you use at work.</h2>
            </div>
            <p className="max-w-[380px] text-base leading-relaxed text-[var(--sc-ink-2)]">Each course goes from first principles to a production review. Take them in any order.</p>
          </div>

          <div className="mt-12 grid gap-7 lg:grid-cols-2">
            {courses.map(({ course, quests, total }) => {
              const courseTiers = tiers.filter((t) => t.course === course.id);
              const guides = Array.from(new Set(quests.map((q) => guideIn(course, q.slug)))).slice(0, 4);
              return (
                <article key={course.id} id={`course-${course.id}`} className="sc-h-lift flex scroll-mt-24 flex-col overflow-hidden rounded-3xl border border-[var(--sc-line)] bg-white shadow-[var(--sc-shadow-md)]">
                  <div className="flex items-start gap-5 bg-[radial-gradient(120%_140%_at_100%_0%,#2a3a36_0%,#16140f_55%)] p-6 text-white sm:p-8">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#7fdbca]">{course.name}</p>
                      <h3 className="mt-2.5 text-[26px] font-extrabold leading-[1.1] tracking-[-.03em] sm:text-[32px]">
                        {course.home.headline[0]}
                        <br />
                        {course.home.headline[1]}
                      </h3>
                      <p className="mt-2.5 text-sm text-[#b9b4a8]">
                        {quests.length} quests · {aboutHours(total)} · beginner to production
                      </p>
                    </div>
                    <div className="flex shrink-0">{badgePair(course, "h-12 w-12 sm:h-[76px] sm:w-[76px] drop-shadow-[0_10px_12px_rgba(0,0,0,.5)]", "-ml-3 sm:-ml-4", "sc-h-bob")}</div>
                  </div>
                  <ul className="px-6 pt-2 sm:px-8">
                    {course.regionOrder.map((r, i) => {
                      const region = course.regions[r];
                      const n = quests.filter((q) => q.region === r).length;
                      return (
                        <li key={r} className={`grid grid-cols-[14px_minmax(0,1fr)] items-start gap-3.5 py-5 sm:grid-cols-[14px_minmax(0,1fr)_auto] ${i ? "" : "border-b border-[var(--sc-paper-2)]"}`}>
                          <span className="mt-1.5 h-2.5 w-2.5 rounded-[3px]" style={{ background: region.color }} />
                          <div>
                            <h4 className="font-bold">
                              {region.part} · {r} — {region.title.charAt(0).toUpperCase() + region.title.slice(1)}
                              <span className="font-semibold text-[var(--sc-ink-3)] sm:hidden"> · {n} quests</span>
                            </h4>
                            <p className="mt-1 text-sm leading-relaxed text-[var(--sc-ink-3)]">{region.blurb}</p>
                          </div>
                          <span className="hidden text-[13px] font-semibold text-[var(--sc-ink-3)] sm:block">{n} quests</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mx-6 flex items-start gap-3 rounded-2xl bg-[var(--sc-paper)] px-4 py-3.5 text-sm text-[var(--sc-ink-2)] sm:mx-8">
                    <Icon d={shield} className="mt-0.5 h-[18px] w-[18px] text-[var(--sc-accent)]" />
                    <span>
                      Certificates: <b className="text-[var(--sc-ink)]">{courseTiers.map((t) => t.short.replace(/^(NoSQL|Object Storage|Infrastructure as Code) (?=Advanced|Production|Practitioner)/, "")).join(" · ")}</b>
                    </span>
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-3 p-6 sm:px-8 sm:pb-8">
                    <Link href={questHref(course, quests[0].slug)} className={btnDark}>
                      Start Quest 1 <Icon d={arrow} className="h-[15px] w-[15px]" />
                    </Link>
                    <Link href={course.basePath} className={btnLight}>
                      See all {quests.length} quests
                    </Link>
                    <div aria-hidden className="ml-auto hidden sm:flex">
                      {guides.map((g) => (
                        <CritterIcon key={g} type={g} size={34} />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-7 flex flex-col gap-4 rounded-[20px] border-[1.5px] border-dashed border-[#cfc8b6] p-5 sm:flex-row sm:items-center sm:gap-5 sm:px-7">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--sc-line)] bg-white text-[22px] font-extrabold text-[var(--sc-accent)]">?</span>
            <div className="flex-1">
              <p className="text-[17px] font-bold">Which AWS service should we teach next?</p>
              <p className="mt-0.5 text-sm text-[var(--sc-ink-3)]">The next course is picked by the people who ask for it.</p>
            </div>
            <a href={`mailto:${FOUNDER_EMAIL}?subject=Next%20course%20request`} className={`${btnLight} h-[46px] text-sm`}>
              Vote by email <Icon d={arrow} className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Certificates ── */}
      <section id="certificates" className="scroll-mt-20 border-t border-[var(--sc-line)] bg-white">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[440px_minmax(0,1fr)] lg:py-28">
          <div>
            <Eyebrow>Certificates</Eyebrow>
            <h2 className="mt-3.5 text-[34px] font-extrabold leading-[1.05] tracking-[-.035em] sm:text-5xl">Proof you can point to.</h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--sc-ink-2)]">
              Finish a part and claim a certificate. It lives on its own public page that anyone can verify, and goes on your LinkedIn profile in one click.
            </p>
            <table className="mt-8 w-full overflow-hidden rounded-2xl border border-[var(--sc-line)] text-left text-[13px] sm:text-sm">
              <thead className="bg-[var(--sc-paper)] text-xs font-bold uppercase tracking-[.1em] text-[var(--sc-ink-3)]">
                <tr>
                  <th className="px-4 py-3">Tier</th>
                  {courses.map(({ course }) => (
                    <th key={course.id} className="px-4 py-3">
                      {COURSE_COPY[course.id].eyebrow.replace("Amazon ", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["Foundations", "Advanced Patterns", "Practitioner"].map((level, row) => (
                  <tr key={level} className="border-t border-[var(--sc-paper-2)]">
                    <th className="px-3 py-3.5 font-bold sm:px-4">{level}</th>
                    {courses.map(({ course, quests }) => {
                      const region = course.regionOrder[row];
                      const cell = region ? `${region} · ${quests.filter((q) => q.region === region).length} quests` : `All ${quests.length} quests`;
                      return (
                        <td key={course.id} className="px-3 py-3.5 text-[var(--sc-ink-2)] sm:whitespace-nowrap sm:px-4">
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-5 flex flex-wrap gap-2.5 text-[13px] font-semibold text-[#0b5d51]">
              {["Verifiable public link", "PDF download", "Unlisted if you prefer"].map((t) => (
                <li key={t} className="flex items-center gap-1.5 rounded-full bg-[var(--sc-accent-soft)] px-3 py-1.5">
                  <Icon d={check} className="h-3.5 w-3.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Certificate preview — a tilted paper stack on large screens */}
          <div className="relative isolate pb-10 pt-8 [perspective:1600px] lg:py-10" role="img" aria-label="Example certificate: Serverless Creed NoSQL Foundations for Amazon DynamoDB">
            <span aria-hidden className="sc-h-glow left-[10%] top-0 h-[480px] w-[480px] bg-[radial-gradient(closest-side,rgba(201,180,138,.35),transparent)]" />
            <div aria-hidden className="sc-h-paper relative lg:mx-6">
              <div className="sc-h-sheet-2 absolute inset-0 hidden rounded-md bg-[#efe9dc] shadow-[0_30px_50px_-24px_rgba(22,20,15,.3)] lg:block" />
              <div className="sc-h-sheet-1 absolute inset-0 hidden rounded-md bg-[#f5f0e5] shadow-[0_20px_40px_-24px_rgba(22,20,15,.3)] lg:block" />
              <div className="sc-h-shine relative rounded-md sm:aspect-[1.414] bg-gradient-to-br from-[#fdfbf6] to-[#f7f2e7] p-2.5 shadow-[inset_0_1px_0_#fff,0_40px_70px_-30px_rgba(22,20,15,.45),0_12px_24px_-14px_rgba(22,20,15,.25)] sm:p-3.5">
                <div className="h-full border-2 border-[var(--sc-ink)] p-1">
                  <div className="flex h-full flex-col items-center border border-[#c9b48a] px-4 py-4 text-center sm:px-9 sm:py-7">
                    <Logo markClassName="h-4 w-auto sm:h-6" wordmarkClassName="text-[10px] sm:text-[15px]" className="text-[var(--sc-ink)]" />
                    <p className="mt-2 text-[8px] font-bold tracking-[.32em] text-[var(--sc-accent)] sm:mt-4 sm:text-[11px]">CERTIFICATE OF COMPLETION</p>
                    <p className="mt-2 hidden font-serif text-sm italic text-[var(--sc-ink-2)] sm:block">This certifies that</p>
                    <p className="mt-1.5 border-b border-[#c9b48a] px-6 pb-1 font-serif text-xl sm:px-10 sm:text-[38px] sm:leading-tight">Your Name</p>
                    <p className="mt-2 hidden font-serif text-sm italic text-[var(--sc-ink-2)] sm:block">has completed all {courses[0].quests.filter((q) => q.region === "Kanto").length} hands-on quests of</p>
                    <p className="mt-1.5 text-[13px] font-extrabold tracking-[-.02em] sm:mt-2 sm:text-[22px]">{TIERS.foundations.title}</p>
                    <p className="text-[11px] text-[var(--sc-ink-2)] sm:text-sm">{TIERS.foundations.forService}</p>
                    <div className="mt-auto hidden w-full items-end justify-between text-[11px] text-[var(--sc-ink-3)] sm:flex">
                      <div className="text-left">
                        <p className="border-b border-[#c9b48a] pb-1 font-serif text-lg italic text-[var(--sc-ink)]">Vidit Shah</p>
                        <p className="mt-1">Founder, Serverless Creed</p>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={COURSES.dynamodb.regions.Kanto.badge} alt="" className="h-[60px] w-[60px] drop-shadow-[0_6px_8px_rgba(22,20,15,.3)]" />
                      <div className="text-right">
                        <p className="border-b border-[#c9b48a] pb-1 font-mono text-xs text-[var(--sc-ink)]">serverlesscreed.com/c/…</p>
                        <p className="mt-1">Verify this certificate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div aria-hidden className="sc-h-bob absolute -bottom-1 right-0 flex items-center gap-2.5 rounded-full bg-[#0a66c2] px-5 py-3 text-[15px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_18px_34px_-12px_rgba(10,102,194,.7)] lg:bottom-6 lg:-right-2" style={{ animationDuration: "4.6s" }}>
              <span className="grid h-[22px] w-[22px] place-items-center rounded bg-white text-[13px] font-extrabold text-[#0a66c2]">in</span>+ Add to profile
            </div>
            <div aria-hidden className="sc-h-bob sc-h-depth absolute left-0 top-0 hidden items-center gap-2 rounded-full border border-[var(--sc-line)] bg-white px-4 py-2.5 text-[13px] font-bold text-[#0b5d51] sm:flex" style={{ animationDuration: "5.4s", animationDelay: "-2s" }}>
              <Icon d={shield} className="h-4 w-4" />
              Verified by Serverless Creed
            </div>
          </div>
        </div>
      </section>

      {/* ── Desktop tools ── */}
      <section id="tools" className="relative isolate scroll-mt-20 overflow-hidden bg-[var(--sc-ink)] text-white">
        <span aria-hidden className="sc-h-glow -left-48 -top-64 h-[700px] w-[700px] bg-[radial-gradient(closest-side,rgba(19,165,142,.16),transparent)]" />
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <Eyebrow dark>Desktop tools</Eyebrow>
              <h2 className="mt-3.5 text-[34px] font-extrabold leading-[1.05] tracking-[-.035em] sm:text-5xl">
                Learned it here?
                <br />
                Now work faster.
              </h2>
            </div>
            <p className="max-w-[420px] text-[17px] leading-relaxed text-[#b9b4a8]">
              We build focused desktop clients for the same services we teach — for the day you move from the simulator to your real AWS account.
            </p>
          </div>
          <div className="mt-12 grid gap-7 lg:grid-cols-2">
            {PRODUCTS.map((p, i) => (
              <article key={p.name} className="sc-h-lift flex flex-col gap-5 rounded-3xl border border-[#34302a] bg-gradient-to-b from-[#26221b] to-[#1d1a15] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_30px_60px_-30px_rgba(0,0,0,.6)] sm:p-8">
                <div className="flex flex-wrap items-center gap-5">
                  <span className="flex [perspective:500px]">
                    <Image src={p.icon} alt={`${p.name} app icon`} width={96} height={96} className="sc-h-turn h-20 w-20 sm:h-24 sm:w-24" style={i ? delay(-3.5) : undefined} />
                  </span>
                  <div>
                    <h3 className="text-3xl font-extrabold tracking-[-.03em]">{p.name}</h3>
                    <p className="mt-1 text-sm text-[#b9b4a8]">Desktop client for {p.service}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${p.tone}`}>Pairs with {p.course}</span>
                </div>
                <p className="text-base leading-relaxed text-[#d8d3c7]">{p.description}</p>
                <ul className="flex flex-wrap gap-2 text-[13px] font-semibold text-[#d8d3c7]">
                  {p.features.map((f) => (
                    <li key={f} className="rounded-full border border-[#3a352d] px-3 py-1.5">
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto grid gap-3 pt-1 sm:flex">
                  <a href={p.storeHref} target="_blank" rel="noreferrer" aria-label={`Get ${p.name} for Windows from the Microsoft Store`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-[var(--sc-ink)] transition hover:-translate-y-0.5">
                    Get for Windows <Icon d={external} className="h-3.5 w-3.5" />
                  </a>
                  <a href={p.websiteHref} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#4a453b] px-6 text-[15px] font-bold transition hover:-translate-y-0.5 hover:border-white">
                    Explore {p.name} <Icon d={external} className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="mx-auto grid max-w-[1200px] scroll-mt-20 gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div>
          <Eyebrow>Why Serverless Creed</Eyebrow>
          <blockquote className="mt-4 text-[26px] font-bold leading-[1.25] tracking-[-.025em] sm:text-4xl">“Good lessons and good tools have the same job: respect your time and get you to done.”</blockquote>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <span className="relative shrink-0">
              <Image
                src="/founder/vidit-shah.jpg"
                alt="Vidit Shah, founder of Serverless Creed"
                width={128}
                height={128}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-[0_12px_24px_-10px_rgba(22,20,15,.45)]"
              />
              <span aria-hidden className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--sc-ink)] text-white ring-2 ring-[var(--sc-paper)]">
                <LambdaMark className="h-2.5 w-auto" />
              </span>
            </span>
            <div>
              <p className="font-bold">Vidit Shah</p>
              <p className="text-sm text-[var(--sc-ink-3)]">Founder, Serverless Creed</p>
            </div>
            <a href={`mailto:${FOUNDER_EMAIL}?subject=Hello%20from%20serverlesscreed.com`} className={`${btnLight} h-11 text-sm sm:ml-4`}>
              <Icon d={mail} />
              Say hello
            </a>
          </div>
        </div>
        <ol className="border-t border-[var(--sc-line)]">
          {PRINCIPLES.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-b border-[var(--sc-line)] py-6">
              <span className="pt-1 font-mono text-[13px] text-[var(--sc-ink-3)]">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--sc-ink-3)]">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Open source ── */}
      <OpenSourceSection />

      {/* ── Contribute ── */}
      <ContributeSection />

      {/* ── Footer ── */}
      <footer className="bg-[var(--sc-ink)] text-[#d8d3c7]">
        <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-16 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" aria-label="Serverless Creed home" className="text-white">
                <Logo markClassName="h-[30px] w-auto" wordmarkClassName="text-[18px]" />
              </Link>
              <p className="mt-4 max-w-[320px] text-[15px] leading-relaxed text-[#b9b4a8]">Learn AWS by doing. Then do it faster.</p>
            </div>
            {[
              ["Learn", [["Learn DynamoDB", "/dynamodb"], ["Learn S3", "/s3"], ["Learn CDK", "/cdk"], ["Certificates", "#certificates"]]],
              ["Tools", [["Tables for DynamoDB", "https://tables.serverlesscreed.com/"], ["Buckets for S3", "https://buckets.serverlesscreed.com/"]]],
              ["Company", [["Contribute a course", "#contribute"], ["GitHub", REPO_URL], ["Contact the founder", `mailto:${FOUNDER_EMAIL}`]]],
            ].map(([heading, links]) => (
              <nav key={heading as string} aria-label={heading as string} className="flex flex-col gap-3 text-[15px]">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#8a8478]">{heading as string}</p>
                {(links as string[][]).map(([label, href]) =>
                  href.startsWith("/") ? (
                    <Link key={label} href={href} className="transition hover:text-white">
                      {label}
                    </Link>
                  ) : (
                    <a key={label} href={href} className="transition hover:text-white">
                      {label}
                    </a>
                  ),
                )}
              </nav>
            ))}
          </div>
          <div className="mt-14 flex flex-col gap-3 border-t border-[#2e2a23] pt-6 text-[13px] text-[#8a8478] md:flex-row md:justify-between md:gap-10">
            <p>© {new Date().getFullYear()} Serverless Creed</p>
            <p className="max-w-[760px] md:text-right">
              Amazon S3, Amazon DynamoDB and AWS CDK are trademarks or service names of Amazon.com, Inc. Pokémon names are used for teaching only. Serverless Creed is not affiliated with AWS, Nintendo, Creatures or GAME FREAK.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
