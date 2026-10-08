"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { FiArrowRight, FiCheck, FiCopy, FiDownload, FiPlus, FiTrash2 } from "react-icons/fi";
import { useProgress } from "@/components/learn/progress-provider";
import { track } from "@/lib/analytics";
import { certificateUrl, linkedInAddUrl, linkedInShareUrl, xShareUrl } from "@/lib/certificates/share";
import { TIERS, type TierId } from "@/lib/certificates/tiers";
import { COURSES } from "@/lib/learn/courses";

/** Top of the certificate page: owner actions (LinkedIn, share, PDF, delete) or a visitor call to action. */
export function CertificateActions({ id, tier, name, issuedAt, quests }: { id: string; tier: TierId; name: string; issuedAt: string; quests: number }) {
  const router = useRouter();
  const home = COURSES[TIERS[tier].course].basePath;
  const { certificates, saveCertificate, isLoading } = useProgress();
  const mine = certificates[tier]?.id === id ? certificates[tier] : undefined;
  const [fresh, setFresh] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setFresh(new URLSearchParams(window.location.search).get("new") === "1");
    track("certificate_view", { tier });
  }, [tier]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl(id));
      setCopied(true);
      track("certificate_share", { tier, channel: "copy" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard unavailable: the URL is in the address bar. */
    }
  };

  const remove = async () => {
    if (!mine?.manageKey) return;
    setDeleting(true);
    const res = await fetch(`/api/certificates/${id}`, { method: "DELETE", headers: { "x-manage-key": mine.manageKey } });
    if (res.ok) {
      saveCertificate(tier, null);
      router.replace(`${home}#certificates`);
    } else setDeleting(false);
  };

  const pill = "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-px";
  const ghost = `${pill} border border-[var(--sc-line)] bg-white text-[var(--sc-ink)] shadow-[var(--sc-shadow-sm)] hover:border-[#d6cfbf]`;

  if (isLoading) return <div className="sc-no-print h-11" aria-hidden />;

  if (!mine) {
    return (
      <div className="sc-no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--sc-accent)]">Certificate of completion</p>
          <h1 className="mt-1 text-[1.9rem] font-semibold leading-tight tracking-[-.02em] text-[var(--sc-ink)]">{name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className={ghost}>
            {copied ? <FiCheck /> : <FiCopy />} {copied ? "Copied" : "Copy link"}
          </button>
          <Link href={home} className={`${pill} bg-[var(--sc-ink)] text-white shadow-[var(--sc-shadow-md)] hover:bg-black`}>
            Earn yours <FiArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-no-print">
      {fresh && (
        <div className="sc-rise mb-6 rounded-[24px] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 sm:p-6">
          <p className="text-[1.15rem] font-semibold text-emerald-950">Congratulations, {name.split(" ")[0]}! Your certificate is live.</p>
          <p className="mt-1 text-sm text-emerald-900/75">Add it to your LinkedIn profile now — it takes one click and links straight back to this verified page.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--sc-accent)]">Your certificate</p>
          <h1 className="mt-1 text-[1.6rem] font-semibold leading-tight tracking-[-.02em] text-[var(--sc-ink)]">{TIERS[tier].short}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={linkedInAddUrl({ id, tier, issuedAt })}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("certificate_linkedin_add", { tier })}
            className={`${pill} bg-[#0a66c2] text-white shadow-[0_8px_20px_-8px_rgba(10,102,194,.7)] hover:bg-[#004182]`}
          >
            <FaLinkedin className="h-4 w-4" /> <FiPlus className="-ml-1 h-3.5 w-3.5" /> Add to profile
          </a>
          <a href={linkedInShareUrl(id)} target="_blank" rel="noreferrer" onClick={() => track("certificate_share", { tier, channel: "linkedin" })} className={ghost}>
            <FaLinkedin className="h-4 w-4 text-[#0a66c2]" /> Share a post
          </a>
          <a href={xShareUrl(id, tier, quests)} target="_blank" rel="noreferrer" onClick={() => track("certificate_share", { tier, channel: "x" })} className={ghost}>
            <FaXTwitter className="h-4 w-4" /> Post
          </a>
          <button type="button" onClick={copy} className={ghost}>
            {copied ? <FiCheck /> : <FiCopy />} {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => {
              track("certificate_share", { tier, channel: "pdf" });
              window.print();
            }}
            className={ghost}
          >
            <FiDownload /> PDF
          </button>
        </div>
      </div>
      {mine.manageKey && (
        <div className="mt-3 flex justify-end text-[13px]">
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-[var(--sc-ink-2)]">Delete this certificate for everyone? Links to it will stop working.</span>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-2.5 py-1 font-medium hover:bg-black/5">
                Keep
              </button>
              <button type="button" disabled={deleting} onClick={remove} className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 font-medium text-[var(--sc-ink-3)] hover:text-rose-700">
              <FiTrash2 className="h-3.5 w-3.5" /> Delete certificate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
