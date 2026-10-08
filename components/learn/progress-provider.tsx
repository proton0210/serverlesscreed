"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCourse } from "./course-context";
import { peekStamp, stampKey, type TierId } from "@/lib/certificates/tiers";

export type IssuedCertificate = { id: string; manageKey?: string; name?: string };

type ProgressContextType = {
  completedQuests: Set<string>;
  badges: Set<string>;
  completeQuest: (questId: string, badgeId: string) => Promise<void>;
  isLoading: boolean;
  resetProgress: () => void;
  /** Random id for this browser; server stamps are bound to it (lib/certificates). */
  learnerId: string;
  /** Server-signed proof per `quest:kind`. */
  stamps: Record<string, string>;
  addStamp: (token: string | null | undefined) => void;
  certificates: Partial<Record<TierId, IssuedCertificate>>;
  saveCertificate: (tier: TierId, cert: IssuedCertificate | null) => void;
};

type LocalProgress = {
  completedQuests: string[];
  badges: string[];
  learnerId?: string;
  stamps?: Record<string, string>;
  certificates?: Partial<Record<TierId, IssuedCertificate>>;
};

const emptyProgress: LocalProgress = { completedQuests: [], badges: [] };

function readProgress(storageKey: string, slugs: Set<string>): LocalProgress {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return emptyProgress;
    const parsed = JSON.parse(stored) as Partial<LocalProgress>;
    return {
      completedQuests: Array.isArray(parsed.completedQuests) ? parsed.completedQuests.filter((id): id is string => typeof id === "string" && slugs.has(id)) : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges.filter((id): id is string => typeof id === "string") : [],
      learnerId: typeof parsed.learnerId === "string" ? parsed.learnerId : undefined,
      stamps: parsed.stamps && typeof parsed.stamps === "object" ? parsed.stamps : {},
      certificates: parsed.certificates && typeof parsed.certificates === "object" ? parsed.certificates : {},
    };
  } catch {
    return emptyProgress;
  }
}

const ProgressContext = createContext<ProgressContextType>({
  completedQuests: new Set(),
  badges: new Set(),
  completeQuest: async () => {},
  isLoading: true,
  resetProgress: () => {},
  learnerId: "",
  stamps: {},
  addStamp: () => {},
  certificates: {},
  saveCertificate: () => {},
});

const newLearnerId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));

function persist(storageKey: string, next: LocalProgress) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Progress still works for this session when storage is unavailable.
  }
}

/** Badges for the current course (see course-context), kept in this browser only. */
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { storageKey, quests } = useCourse();
  const slugKey = quests.filter((q) => q.status === "available").map((q) => q.slug).join("|");
  const [progress, setProgress] = useState<LocalProgress>(emptyProgress);
  const progressRef = useRef<LocalProgress>(emptyProgress);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const slugs = new Set(slugKey.split("|"));
    const refresh = () => {
      let next = readProgress(storageKey, slugs);
      if (!next.learnerId) {
        next = { ...next, learnerId: newLearnerId() };
        persist(storageKey, next);
      }
      progressRef.current = next;
      setProgress(next);
      setIsLoading(false);
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [storageKey, slugKey]);

  const completeQuest = useCallback(async (questId: string, badgeId: string) => {
    const current = progressRef.current;
    const completedQuests = Array.from(new Set([...current.completedQuests, questId]));
    const badges = Array.from(new Set([...current.badges, badgeId]));
    const next = { ...current, completedQuests, badges };
    persist(storageKey, next);
    progressRef.current = next;
    setProgress(next);
  }, [storageKey]);

  const addStamp = useCallback((token: string | null | undefined) => {
    const p = token ? peekStamp(token) : null;
    if (!token || !p) return;
    const current = progressRef.current;
    const next = { ...current, stamps: { ...(current.stamps ?? {}), [stampKey(p.q, p.k)]: token } };
    persist(storageKey, next);
    progressRef.current = next;
    setProgress(next);
  }, [storageKey]);

  const saveCertificate = useCallback((tier: TierId, cert: IssuedCertificate | null) => {
    const current = progressRef.current;
    const certificates = { ...(current.certificates ?? {}) };
    if (cert) certificates[tier] = cert;
    else delete certificates[tier];
    const next = { ...current, certificates };
    persist(storageKey, next);
    progressRef.current = next;
    setProgress(next);
  }, [storageKey]);

  const resetProgress = useCallback(() => {
    // Keep the learner id and issued certificates: they point at records on the server.
    const kept: LocalProgress = { ...emptyProgress, learnerId: progressRef.current.learnerId, certificates: progressRef.current.certificates };
    persist(storageKey, kept);
    progressRef.current = kept;
    setProgress(kept);
  }, [storageKey]);

  const value = useMemo<ProgressContextType>(() => ({
    completedQuests: new Set(progress.completedQuests),
    badges: new Set(progress.badges),
    completeQuest,
    isLoading,
    resetProgress,
    learnerId: progress.learnerId ?? "",
    stamps: progress.stamps ?? {},
    addStamp,
    certificates: progress.certificates ?? {},
    saveCertificate,
  }), [addStamp, completeQuest, isLoading, progress, resetProgress, saveCertificate]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export const useProgress = () => useContext(ProgressContext);
