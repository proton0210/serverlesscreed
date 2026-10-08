"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiArrowRight, FiAward, FiX } from "react-icons/fi";
import type { QuestMeta } from "@/lib/learn/types";
import { questHref } from "@/lib/learn/courses";
import { useCourse } from "@/components/learn/course-context";
import { QuestCelebration } from "@/components/learn/quest-celebration";
import { ShareAchievement } from "@/components/learn/share-achievement";
import { ClaimCertificate } from "@/components/certificates/claim-certificate";
import { useCertificates } from "@/components/certificates/use-certificates";
import { TIERS, tiersFor, type TierId } from "@/lib/certificates/tiers";

/** The reward moment: badge spins in over slow rays, then offers the next quest and sharing. */
export function BadgeDialog({
  meta,
  open,
  celebrate,
  regionDone,
  next,
  onClose,
  onCelebrated,
}: {
  meta: QuestMeta;
  open: boolean;
  celebrate: boolean;
  regionDone: boolean;
  next: QuestMeta | null;
  onClose: () => void;
  onCelebrated: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const course = useCourse();
  const region = course.regions[meta.region];
  const certs = useCertificates();
  const [claiming, setClaiming] = useState<TierId | null>(null);
  // A certificate this quest just unlocked (its part, or the whole course), for courses that issue them.
  const ready = course.certificates
    ? (tiersFor(course.id).filter((t) => certs[t]?.status === "ready" && (TIERS[t].region === null || TIERS[t].region === meta.region)).pop() ?? null)
    : null;

  useEffect(() => {
    if (!open || claiming) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose, claiming]);

  if (claiming)
    return (
      <ClaimCertificate
        tier={claiming}
        open
        onClose={() => {
          setClaiming(null);
          onClose();
        }}
      />
    );
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0d0c0a]/60 backdrop-blur-md" aria-hidden />
      <QuestCelebration active={celebrate} onFinished={onCelebrated} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-title"
        onClick={(e) => e.stopPropagation()}
        className="sc-rise relative z-[65] w-full max-w-md overflow-hidden rounded-[28px] bg-[#111214] text-white shadow-[0_40px_120px_-20px_rgba(0,0,0,.6)] ring-1 ring-white/10"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <FiX className="h-5 w-5" />
        </button>

        <div className="relative grid place-items-center overflow-hidden px-8 pb-6 pt-12">
          <div
            aria-hidden
            className="absolute left-1/2 top-[44%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-60 motion-safe:animate-[sc-rays_24s_linear_infinite]"
            style={{
              background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.07) 0 8deg, transparent 8deg 20deg)",
              maskImage: "radial-gradient(circle, #000 20%, transparent 62%)",
              WebkitMaskImage: "radial-gradient(circle, #000 20%, transparent 62%)",
            }}
          />
          <div aria-hidden className="absolute left-1/2 top-[44%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: region.color, opacity: 0.45 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={region.badge} alt="" width={132} height={132} className="relative h-[132px] w-[132px] drop-shadow-[0_18px_30px_rgba(0,0,0,.5)] motion-safe:animate-[sc-spin-in_.8s_cubic-bezier(.3,1.4,.5,1)_both]" />
          <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[.2em] text-white/50">{regionDone ? `${meta.region} complete` : `${meta.region} · quest cleared`}</p>
          <h3 id="badge-title" className="relative mt-2 text-center text-2xl font-semibold tracking-tight">
            {regionDone ? `You finished ${region.part}!` : "Badge earned"}
          </h3>
          <p className="relative mt-2 text-center text-sm leading-relaxed text-white/65">
            You completed <strong className="font-semibold text-white">{meta.title}</strong>. It&apos;s saved in this browser.
          </p>
        </div>

        <div className="border-t border-white/10 px-6 py-5">
          {ready && (
            <button
              type="button"
              onClick={() => setClaiming(ready)}
              className="sc-pop mb-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-[#2fd3b0] px-5 py-3.5 text-left text-[#06231d] shadow-[0_10px_30px_-10px_rgba(47,211,176,.7)] transition hover:bg-[#4be0c0]"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">Your certificate is ready</span>
                <span className="block truncate text-[15px] font-semibold">Claim {TIERS[ready].short}</span>
              </span>
              <FiAward className="h-5 w-5 shrink-0" />
            </button>
          )}
          {next && (
            <Link
              href={questHref(course, next.slug)}
              className="group mb-5 flex items-center justify-between gap-3 rounded-2xl bg-white px-5 py-3.5 text-[#111214] transition hover:bg-[#e8f5f1]"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-black/50">Up next</span>
                <span className="block truncate text-[15px] font-semibold">{next.title}</span>
              </span>
              <FiArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
          <ShareAchievement dark badgeName={`${meta.region} badge`} questTitle={meta.title} service={course.service} topics={meta.topics} />
        </div>
      </div>
    </div>
  );
}
