"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { FiAlertCircle, FiArrowRight, FiLock, FiRefreshCw, FiX } from "react-icons/fi";
import { useProgress } from "@/components/learn/progress-provider";
import { track } from "@/lib/analytics";
import { TIERS, tierQuests, type TierId } from "@/lib/certificates/tiers";
import { COURSES, questHref } from "@/lib/learn/courses";
import { CertificateCard } from "./certificate-card";
import { useCertificates } from "./use-certificates";

/** Claim dialog: live preview, the printed name, public/private, then issue and open the certificate page. */
export function ClaimCertificate({ tier, open, onClose }: { tier: TierId; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { learnerId, stamps, saveCertificate } = useProgress();
  const status = useCertificates()[tier] ?? { tier, status: "progress" as const, done: 0, total: tierQuests(tier).length, recheck: [] };
  const course = COURSES[TIERS[tier].course];
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const total = tierQuests(tier).length;

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, name, learnerId, stamps: Object.values(stamps), public: isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      saveCertificate(tier, { id: data.id, manageKey: data.manageKey, name: name.trim() });
      track("certificate_claim", { tier, public: isPublic, created: Boolean(data.created) });
      router.push(`/c/${data.id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const ready = status.status === "ready";

  return createPortal(
    <div className="sc-app fixed inset-0 z-[80] flex items-end justify-center bg-transparent p-3 sm:items-center sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0d0c0a]/60 backdrop-blur-md" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        onClick={(e) => e.stopPropagation()}
        className="sc-rise relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-[var(--sc-paper)] shadow-[0_40px_120px_-20px_rgba(0,0,0,.6)] ring-1 ring-black/10"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-[var(--sc-ink-3)] transition hover:bg-black/5 hover:text-[var(--sc-ink)]">
          <FiX className="h-5 w-5" />
        </button>
        <div className="p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--sc-accent)]">{ready ? "Your certificate is ready" : "Certificate"}</p>
          <h2 id="claim-title" className="mt-1.5 pr-10 text-[1.6rem] font-semibold leading-tight tracking-[-.02em] text-[var(--sc-ink)]">
            {TIERS[tier].title} <span className="font-normal text-[var(--sc-ink-3)]">— {TIERS[tier].forService}</span>
          </h2>

          <div className="mt-6">
            <CertificateCard name={name.trim()} tier={tier} quests={total} preview />
          </div>

          {ready ? (
            <form onSubmit={submit} className="mt-7 grid gap-5">
              <div>
                <label htmlFor="cert-name" className="text-sm font-semibold text-[var(--sc-ink)]">
                  Name as it should appear
                </label>
                <input
                  ref={inputRef}
                  id="cert-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  autoComplete="name"
                  required
                  aria-describedby="cert-name-hint"
                  className="mt-2 block h-12 w-full rounded-2xl border border-[var(--sc-line)] bg-white px-4 text-[16px] text-[var(--sc-ink)] shadow-[var(--sc-shadow-sm)] outline-none transition focus:border-[var(--sc-accent)] focus:shadow-[0_0_0_4px_rgba(14,124,107,.12)]"
                  placeholder="e.g. Ada Lovelace"
                />
                <p id="cert-name-hint" className="mt-2 text-[13px] text-[var(--sc-ink-3)]">
                  Use the name employers know you by. It can&apos;t be changed after the certificate is created.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--sc-line)] bg-white p-4">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-1 h-4 w-4 accent-[#0e7c6b]" />
                <span className="text-sm leading-relaxed text-[var(--sc-ink-2)]">
                  <span className="font-semibold text-[var(--sc-ink)]">Show it on a public page</span> so search engines and LinkedIn visitors can find it. Untick to keep it
                  unlisted: only people with the link can see it.
                </span>
              </label>
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12.5px] text-[var(--sc-ink-3)]">We store only this name and your quest dates. No email, no account.</p>
                <button
                  type="submit"
                  disabled={busy || name.trim().length < 2}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--sc-ink)] px-6 text-[15px] font-semibold text-white shadow-[var(--sc-shadow-md)] transition hover:-translate-y-px hover:bg-black disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#d8d2c4] disabled:shadow-none"
                >
                  {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
                  {busy ? "Creating…" : "Create my certificate"}
                  {!busy && <FiArrowRight />}
                </button>
              </div>
            </form>
          ) : status.status === "recheck" ? (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-amber-950">
                <FiRefreshCw className="h-4 w-4" /> {status.recheck.length === 1 ? "One quest needs" : `${status.recheck.length} quests need`} a quick re-check
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-900/80">
                You finished these before certificates existed. Run the code challenge and answer the check once more so our server can verify them — it takes about a minute each.
              </p>
              <ul className="mt-3 grid gap-1.5">
                {status.recheck.map((q) => (
                  <li key={q.slug}>
                    <Link href={`${questHref(course, q.slug)}#practice`} onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-950 underline-offset-4 hover:underline">
                      {q.title} <FiArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-7 flex items-center gap-2 rounded-2xl border border-[var(--sc-line)] bg-white p-5 text-sm text-[var(--sc-ink-2)]">
              <FiLock className="h-4 w-4 shrink-0 text-[var(--sc-ink-3)]" /> Finish all {status.total} quests to unlock this certificate — {status.total - status.done} to go.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
