"use client";

import { useMemo } from "react";
import { useProgress, type IssuedCertificate } from "@/components/learn/progress-provider";
import { useCourse } from "@/components/learn/course-context";
import { TIERS, peekStamp, stampKindsFor, stampKey, stampQuest, tierQuests, tiersFor, type TierId } from "@/lib/certificates/tiers";

export type TierStatus = {
  tier: TierId;
  status: "claimed" | "ready" | "recheck" | "progress";
  done: number;
  total: number;
  /** Quests marked complete in this browser but without the server stamps a certificate needs. */
  recheck: { slug: string; title: string }[];
  cert?: IssuedCertificate;
};

/** Where each of the current course's certificates stands for this learner, from local progress and stamps. */
export function useCertificates(): Partial<Record<TierId, TierStatus>> {
  const course = useCourse().id;
  const { completedQuests, stamps, learnerId, certificates } = useProgress();
  return useMemo(() => {
    const valid = new Set(
      Object.entries(stamps)
        .filter(([, token]) => peekStamp(token)?.l === learnerId.toLowerCase())
        .map(([key]) => key)
    );
    const out: Partial<Record<TierId, TierStatus>> = {};
    for (const tier of tiersFor(course)) {
      const qs = tierQuests(tier);
      const stamped = (slug: string) => stampKindsFor(course, slug).every((k) => valid.has(stampKey(stampQuest(course, slug), k)));
      const done = qs.filter((q) => completedQuests.has(q.slug) || stamped(q.slug)).length;
      const recheck = qs.filter((q) => completedQuests.has(q.slug) && !stamped(q.slug)).map((q) => ({ slug: q.slug, title: q.title }));
      const cert = certificates[tier];
      const status = cert ? "claimed" : qs.every((q) => stamped(q.slug)) ? "ready" : done === qs.length ? "recheck" : "progress";
      out[tier] = { tier, status, done, total: qs.length, recheck, cert };
    }
    return out;
  }, [certificates, completedQuests, course, learnerId, stamps]);
}

export const tierTitle = (tier: TierId) => TIERS[tier].title;
