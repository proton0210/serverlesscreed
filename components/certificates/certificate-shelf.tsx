"use client";

import Link from "next/link";
import { useState } from "react";
import { FiArrowRight, FiAward, FiCheck, FiLock, FiRefreshCw } from "react-icons/fi";
import { TIERS, tiersFor, type TierId } from "@/lib/certificates/tiers";
import { useCourse } from "@/components/learn/course-context";
import { ClaimCertificate } from "./claim-certificate";
import { useCertificates } from "./use-certificates";

/** Course-home row: the three certificates and where the learner stands on each. */
export function CertificateShelf() {
  const course = useCourse();
  const status = useCertificates();
  const [claiming, setClaiming] = useState<TierId | null>(null);

  return (
    <section id="certificates" aria-labelledby="certs-h" className="scroll-mt-20 pt-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--sc-accent)]">Certificates</p>
          <h2 id="certs-h" className="mt-1 text-[2rem] font-semibold leading-tight tracking-[-.03em] text-[var(--sc-ink)]">
            Prove it on LinkedIn
          </h2>
        </div>
        <p className="max-w-md text-[14.5px] leading-relaxed text-[var(--sc-ink-3)] sm:text-right">
          Finish a part to claim a verifiable certificate with its own page — one click adds it to your LinkedIn profile.
        </p>
      </div>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {tiersFor(course.id).map((tier) => {
          const s = status[tier];
          const t = TIERS[tier];
          if (!s) return null;
          const pct = Math.round((s.done / s.total) * 100);
          const hero = t.region === null;
          return (
            <li key={tier}>
              <div
                className={`relative flex h-full flex-col overflow-hidden rounded-[24px] border p-6 ${
                  hero ? "border-transparent bg-[#111214] text-white shadow-[var(--sc-shadow-lg)]" : "border-[var(--sc-line)] bg-white shadow-[var(--sc-shadow-sm)]"
                }`}
              >
                {hero && <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#13a58e] opacity-25 blur-3xl" />}
                <div className="relative flex items-center justify-between">
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl ${hero ? "bg-white/10 text-[#7fe8d2]" : "bg-[var(--sc-accent-soft)] text-[var(--sc-accent)]"}`}>
                    <FiAward className="h-5 w-5" />
                  </span>
                  <span className={`text-[12px] font-semibold tabular-nums ${hero ? "text-white/60" : "text-[var(--sc-ink-3)]"}`}>
                    {s.done}/{s.total} quests
                  </span>
                </div>
                <h3 className="relative mt-5 text-[1.15rem] font-semibold leading-snug">{t.short}</h3>
                <p className={`relative text-[13px] ${hero ? "text-white/55" : "text-[var(--sc-ink-3)]"}`}>{t.forService}</p>
                <p className={`relative mt-3 text-[14px] leading-relaxed ${hero ? "text-white/70" : "text-[var(--sc-ink-3)]"}`}>{t.blurb}</p>
                <div className={`relative mt-5 h-1.5 overflow-hidden rounded-full ${hero ? "bg-white/10" : "bg-[#f1eee6]"}`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#0e7c6b] to-[#2fd3b0] transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <div className="relative mt-auto pt-6">
                  {s.status === "claimed" && s.cert ? (
                    <Link
                      href={`/c/${s.cert.id}`}
                      className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ${hero ? "bg-white text-[#111214]" : "bg-emerald-600 text-white"}`}
                    >
                      <FiCheck /> View certificate <FiArrowRight />
                    </Link>
                  ) : s.status === "ready" ? (
                    <button
                      type="button"
                      onClick={() => setClaiming(tier)}
                      className={`sc-pop inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-[var(--sc-shadow-md)] transition hover:-translate-y-px ${
                        hero ? "bg-[#2fd3b0] text-[#06231d]" : "bg-[var(--sc-ink)] text-white"
                      }`}
                    >
                      <FiAward /> Claim certificate
                    </button>
                  ) : s.status === "recheck" ? (
                    <button
                      type="button"
                      onClick={() => setClaiming(tier)}
                      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${hero ? "border-white/20 text-white" : "border-amber-300 bg-amber-50 text-amber-950"}`}
                    >
                      <FiRefreshCw /> Re-check {s.recheck.length} {s.recheck.length === 1 ? "quest" : "quests"} to claim
                    </button>
                  ) : (
                    <span className={`inline-flex items-center gap-2 text-sm font-medium ${hero ? "text-white/60" : "text-[var(--sc-ink-3)]"}`}>
                      <FiLock className="h-3.5 w-3.5" /> {s.total - s.done} {s.total - s.done === 1 ? "quest" : "quests"} to go
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {claiming && <ClaimCertificate tier={claiming} open onClose={() => setClaiming(null)} />}
    </section>
  );
}
