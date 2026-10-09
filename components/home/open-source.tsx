"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type Project = { project: string; repo: string; prs: [number, string][] };

const PROJECTS: Project[] = [
  { project: "AWS CDK CLI", repo: "aws/aws-cdk-cli", prs: [[2023, "cdk watch now respects stack outputs"]] },
  {
    project: "Powertools for AWS Lambda (TypeScript)",
    repo: "aws-powertools/powertools-lambda-typescript",
    prs: [
      [5767, "Parser keeps PhysicalResourceId in CloudFormation events"],
      [5776, "Parser supports EventBridge WITH_METADATA deliveries"],
    ],
  },
  {
    project: "AWS GenAI DB Modernizer",
    repo: "aws-samples/sample-aws-genai-db-modernizer",
    prs: [
      [416, "Support HEXISTS checks in contracts"],
      [417, "Translate the explorer description header"],
      [418, "Validate ATX invocation database names"],
      [428, "Rebuild stale local UI bundles"],
      [431, "Read DocumentDB source tables in the load test"],
      [433, "Preserve schema query links in synthesis"],
      [435, "Preserve PostgreSQL index order in the collector"],
    ],
  },
  { project: "AI/ML Security Assessment", repo: "aws-samples/sample-aiml-security-assessment", prs: [[65, "Choose which service assessments run"]] },
  {
    project: "Serverless Patterns",
    repo: "aws-samples/serverless-patterns",
    prs: [
      [2704, "New pattern: Cognito, Lambda and DynamoDB"],
      [2740, "New pattern: Cognito, AppSync and Bedrock"],
    ],
  },
  { project: "Amazon Bedrock RAG", repo: "aws-samples/amazon-bedrock-rag", prs: [[22, "Update the README for SonarLint, now SonarQube"]] },
  { project: "Syntax UI", repo: "SyntaxUI/syntaxui", prs: [[141, "Fix the id on the spring animated features component"]] },
  { project: "Next to None (MDX course)", repo: "meech-ward/next-to-none-mdx", prs: [[5, "Fix a video link in the getting-started lesson"]] },
];

const CERTS = [
  { name: "AWS Certified DevOps Engineer – Professional", img: "/certifications/devops-professional.png", href: "https://www.credly.com/badges/16d5ea20-555b-4e3d-9e6d-bac8757f25e3" },
  { name: "AWS Certified Solutions Architect – Professional", img: "/certifications/solutions-architect-professional.png", href: "https://www.credly.com/badges/d51490e4-3736-4f7d-8e26-b29e63ce31f3" },
  { name: "AWS Certified Advanced Networking – Specialty", img: "/certifications/advanced-networking-specialty.png", href: "https://www.credly.com/badges/861d088f-d036-44b5-a269-3bce800465ee" },
];

const PR_COUNT = PROJECTS.reduce((n, p) => n + p.prs.length, 0);

/** Fires once when the element first scrolls into view. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = duration === 0 ? 1 : Math.min((t - start) / duration, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{run ? n : 0}</>;
}

const mergeIcon = (
  <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
    <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
  </svg>
);

export function OpenSourceSection() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const glow = useRef<HTMLDivElement>(null);
  let row = 0;

  return (
    <section
      id="open-source"
      className="sc-os relative isolate scroll-mt-20 overflow-hidden border-t border-[var(--sc-line)] bg-[var(--sc-paper-2)] text-[var(--sc-ink)]"
      onPointerMove={(e) => {
        const el = glow.current;
        if (!el) return;
        const r = e.currentTarget.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
    >
      {/* atmosphere */}
      <div aria-hidden className="sc-os-grid pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden ref={glow} className="sc-os-glow pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(19,165,142,.20),transparent)]" />

      <div ref={ref} className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <p className="text-[13px] font-bold uppercase tracking-[.16em] text-[var(--sc-accent)]">Meet your developer</p>
        <h2 className="mt-4 max-w-[860px] text-[34px] font-bold leading-[1.08] tracking-[-.03em] sm:text-5xl lg:text-[56px]">
          Hi, I’m Vidit.
          <span className="block text-[var(--sc-accent)]">I build these courses.</span>
        </h2>
        <p className="mt-5 max-w-[660px] text-[17px] leading-relaxed text-[var(--sc-ink-2)]">
          I’m a developer from Mumbai who learns AWS by building with it. Along the way I’ve been lucky to have {PR_COUNT} contributions accepted by projects I rely on, like the AWS CDK CLI and Powertools for AWS Lambda, and I’m grateful to the maintainers who took the time to review them. I try to bring the same care to every lesson here. If you ever spot a mistake, please tell me and I’ll fix it.
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-14">
          {/* ── dossier ── */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="sc-os-card relative overflow-hidden rounded-[22px] border border-[var(--sc-line)] bg-white p-6 shadow-[var(--sc-shadow-lg)]">
              <div className="flex items-center gap-4">
                <Image
                  src="/founder/vidit-shah.jpg"
                  alt="Vidit Shah"
                  width={128}
                  height={128}
                  className="h-16 w-16 rounded-full object-cover ring-4 ring-[var(--sc-accent-soft)]"
                />
                <div>
                  <p className="text-lg font-bold">Vidit Shah</p>
                  <p className="text-sm text-[var(--sc-ink-3)]">Developer, Serverless Creed · Mumbai</p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-3 gap-2 border-y border-[var(--sc-line)] py-5 text-center">
                {[
                  [PR_COUNT, "merged upstream"],
                  [PROJECTS.length, "projects"],
                  [CERTS.length, "certifications"],
                ].map(([n, label]) => (
                  <div key={label as string}>
                    <dt className="font-mono text-[28px] font-bold leading-none">
                      <CountUp to={n as number} run={seen} />
                    </dt>
                    <dd className="mt-1.5 text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--sc-ink-3)]">{label as string}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-[var(--sc-ink-3)]">AWS certifications</p>
              <ul className="mt-4 grid grid-cols-3 gap-2">
                {CERTS.map((c) => (
                  <li key={c.href}>
                    <a
                      href={c.href}
                      title={`${c.name}, verify on Credly`}
                      aria-label={`${c.name}, verify on Credly`}
                      className="sc-os-cert group relative block overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-1 hover:drop-shadow-[0_14px_14px_rgba(14,124,107,.28)]"
                    >
                      <Image src={c.img} alt={c.name} width={240} height={240} className="h-auto w-full" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-[var(--sc-ink-3)]">Tap a badge to verify it on Credly.</p>

              <a
                href="https://github.com/proton0210"
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--sc-ink)] text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
              >
                View GitHub profile
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 4h6v6M20 4l-9 9" />
                </svg>
              </a>
            </div>
          </aside>

          {/* ── merge log ── */}
          <div className="min-w-0 overflow-hidden rounded-[22px] border border-[#2a2d34] bg-[var(--sc-code-bg)] text-[#e8e4d8] shadow-[var(--sc-shadow-lg)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 truncate font-mono text-xs text-[#8a8478]">git log --merged  ·  accepted upstream</span>
            </div>
            <div className="px-4 py-5 font-mono text-[13px] sm:px-6 sm:py-6">
              <p className="text-[#7fdbca]">
                <span className="text-[#8a8478]">$</span> {PR_COUNT} pull requests merged by the maintainers<span className="sc-os-caret ml-1 inline-block h-[1.1em] w-[7px] translate-y-[3px] bg-[#7fdbca]" />
              </p>
              {PROJECTS.map(({ project, repo, prs }) => (
                <div key={repo} className="mt-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-sans text-[17px] font-bold text-white">{project}</h3>
                    <a href={`https://github.com/${repo}`} className="truncate text-xs text-[#8a8478] transition hover:text-[#7fdbca]">
                      {repo}
                    </a>
                  </div>
                  <ul className="mt-2.5 border-l border-white/10">
                    {prs.map(([num, title]) => {
                      const i = row++;
                      return (
                        <li key={num} className={`sc-os-row ${seen ? "is-in" : ""}`} style={{ "--i": i } as CSSProperties}>
                          <a
                            href={`https://github.com/${repo}/pull/${num}`}
                            className="group -ml-px grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 border-l border-transparent py-3 pl-3 pr-2 transition hover:border-[#7fdbca] hover:bg-white/[.04] sm:grid-cols-[auto_58px_minmax(0,1fr)] sm:py-2"
                          >
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8957e5]/20 px-2 py-0.5 text-[11px] font-semibold text-[#c9a7ff]">
                              {mergeIcon}
                              <span>Merged</span>
                            </span>
                            <span className="text-[#8a8478]">#{num}</span>
                            <span className="col-span-2 font-sans text-[14px] leading-snug text-[#d8d3c7] group-hover:text-white sm:col-span-1">{title}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
