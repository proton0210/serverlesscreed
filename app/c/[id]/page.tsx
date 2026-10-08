import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowRight, FiCheckCircle, FiClock, FiShield } from "react-icons/fi";
import {
  certificateStore,
  type CertificateRecord,
} from "@/lib/certificates/store";
import { CERT_ID_RE, TIERS, tierQuests } from "@/lib/certificates/tiers";
import { SITE_URL, certificateUrl } from "@/lib/certificates/share";
import { COURSES, availableIn, minutes, questHref } from "@/lib/learn/courses";
import {
  CertificateCard,
  formatIssued,
} from "@/components/certificates/certificate-card";
import { CertificateActions } from "@/components/certificates/certificate-actions";
import { ProgressProvider } from "@/components/learn/progress-provider";
import { CourseProvider } from "@/components/learn/course-context";
import { AnalyticsScript } from "@/components/learn/analytics-script";

export const dynamic = "force-dynamic";

async function load(id: string): Promise<CertificateRecord | null> {
  if (!CERT_ID_RE.test(id)) return null;
  const store = certificateStore();
  if (!store) return null;
  const record = await store.get(id).catch(() => null);
  return record && record.status === "active" ? record : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cert = await load(id);
  if (!cert)
    return { title: "Certificate not found", robots: { index: false } };
  const t = TIERS[cert.tier];
  const title = `${cert.name} — ${t.short} certificate`;
  const description = `${cert.name} completed all ${cert.quests.length} hands-on quests of ${t.title} (${t.forService}), issued by Serverless Creed on ${formatIssued(cert.issuedAt)}.`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: `/c/${cert.id}` },
    robots: cert.public
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      url: certificateUrl(cert.id),
      title,
      description,
      siteName: "Serverless Creed",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cert = await load(id);
  if (!cert) notFound();
  const t = TIERS[cert.tier];
  const course = COURSES[t.course];
  const courseQuests = availableIn(course);
  const titles = new Map(courseQuests.map((q) => [q.slug, q]));
  const totalMin = tierQuests(cert.tier).reduce(
    (sum, q) => sum + minutes(q.duration),
    0,
  );
  const topics = Array.from(
    new Set(
      cert.quests.flatMap((q) => titles.get(q.slug)?.topics.slice(0, 1) ?? []),
    ),
  );

  return (
    <CourseProvider courseId={course.id}>
      <ProgressProvider>
        <AnalyticsScript />
        <div className="sc-app min-h-screen">
          <header className="sc-no-print border-b border-[var(--sc-line)]">
            <nav className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 sm:px-8">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                aria-label="Serverless Creed home"
              >
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--sc-ink)] text-[13px] font-black text-white"
                >
                  SC
                </span>
                <span className="hidden text-[13px] font-bold uppercase tracking-[.14em] text-[var(--sc-ink)] sm:inline">
                  Serverless Creed
                </span>
              </Link>
              <Link
                href={course.basePath}
                className="rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-[var(--sc-ink)] hover:bg-black/[.04]"
              >
                {course.name}
              </Link>
            </nav>
          </header>

          <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-8 sm:py-14">
            <CertificateActions
              id={cert.id}
              tier={cert.tier}
              name={cert.name}
              issuedAt={cert.issuedAt}
              quests={cert.quests.length}
            />

            <div className="sc-print-area mt-8">
              <CertificateCard
                name={cert.name}
                tier={cert.tier}
                quests={cert.quests.length}
                issuedAt={cert.issuedAt}
                id={cert.id}
              />
            </div>

            <section
              aria-labelledby="verify-h"
              className="sc-no-print mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
            >
              <div className="rounded-[24px] border border-[var(--sc-line)] bg-white p-6 shadow-[var(--sc-shadow-sm)] sm:p-7">
                <p
                  id="verify-h"
                  className="flex items-center gap-2 text-[15px] font-semibold text-emerald-800"
                >
                  <FiShield className="h-4 w-4" /> Verified by Serverless Creed
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--sc-ink-2)]">
                  Issued to{" "}
                  <strong className="text-[var(--sc-ink)]">{cert.name}</strong>{" "}
                  on {formatIssued(cert.issuedAt)}. Each quest below was passed
                  on our servers — the code challenge where there is one, and
                  the check — before this certificate could be created.
                </p>
                <ol className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-2">
                  {cert.quests.map((q, i) => {
                    const meta = titles.get(q.slug);
                    return (
                      <li
                        key={q.slug}
                        className="flex items-center gap-3 rounded-xl border border-[#efebe1] px-3 py-2.5 text-sm"
                      >
                        <FiCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="w-6 font-mono text-[12px] text-[var(--sc-ink-3)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <Link
                          href={questHref(course, q.slug)}
                          className="min-w-0 flex-1 truncate font-medium text-[var(--sc-ink)] hover:underline"
                        >
                          {meta?.topics.join(" · ") ?? q.slug}
                        </Link>
                        <span className="hidden shrink-0 text-[12.5px] text-[var(--sc-ink-3)] sm:inline">
                          {formatIssued(q.passedAt)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <aside className="grid content-start gap-4">
                <div className="rounded-[24px] border border-[var(--sc-line)] bg-white p-6 shadow-[var(--sc-shadow-sm)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-ink-3)]">
                    About this certificate
                  </p>
                  <p className="mt-2 text-[15px] font-semibold text-[var(--sc-ink)]">
                    {t.title}{" "}
                    <span className="font-normal text-[var(--sc-ink-3)]">
                      — {t.forService}
                    </span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--sc-ink-3)]">
                    {t.blurb}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-[12px] text-[var(--sc-ink-3)]">
                        Quests
                      </dt>
                      <dd className="font-semibold text-[var(--sc-ink)]">
                        {cert.quests.length}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[12px] text-[var(--sc-ink-3)]">
                        Course time
                      </dt>
                      <dd className="inline-flex items-center gap-1 font-semibold text-[var(--sc-ink)]">
                        <FiClock className="h-3.5 w-3.5" />{" "}
                        {Math.round((totalMin / 60) * 10) / 10} h
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[12px] text-[var(--sc-ink-3)]">
                        Certificate ID
                      </dt>
                      <dd className="font-mono font-semibold text-[var(--sc-ink)]">
                        {cert.id}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 flex flex-wrap gap-1.5">
                    {topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-[#f4f1e8] px-2.5 py-1 text-[12px] text-[var(--sc-ink-2)]"
                      >
                        {topic}
                      </span>
                    ))}
                  </p>
                  <p className="mt-4 border-t border-[#efebe1] pt-3 text-[12px] leading-relaxed text-[var(--sc-ink-3)]">
                    A certificate of course completion, {cert.edition}. It is
                    not an AWS Certification, and Serverless Creed is not
                    affiliated with Amazon Web Services.
                  </p>
                </div>
                <Link
                  href={course.basePath}
                  className="group flex items-center justify-between gap-3 rounded-[24px] bg-[#111214] p-6 text-white transition hover:bg-black"
                >
                  <span>
                    <span className="block text-[15px] font-semibold">
                      {course.name} for free
                    </span>
                    <span className="mt-1 block text-[13px] text-white/60">
                      {courseQuests.length} hands-on quests · no signup · no AWS account
                    </span>
                  </span>
                  <FiArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              </aside>
            </section>
          </main>
        </div>
      </ProgressProvider>
    </CourseProvider>
  );
}
