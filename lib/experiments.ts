"use client";

import { useEffect, useState } from "react";
import { setGlobalAnalyticsProps } from "@/lib/analytics";

/**
 * Quest 1 pilot (PRD): 50/50 split between the partition-lab scene and the
 * original lesson. Runs only when NEXT_PUBLIC_EXPERIMENT_QUEST1_SCENE=on;
 * otherwise everyone gets the scene. Assignment is stored per browser.
 */
export type Quest1Variant = "scene" | "control";

const STORAGE_KEY = "sc-exp-quest1-scene";
export const quest1ExperimentOn = process.env.NEXT_PUBLIC_EXPERIMENT_QUEST1_SCENE === "on";

function readOrAssign(): Quest1Variant {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "scene" || stored === "control") return stored;
    const variant: Quest1Variant = Math.random() < 0.5 ? "scene" : "control";
    window.localStorage.setItem(STORAGE_KEY, variant);
    return variant;
  } catch {
    // Storage blocked: assign for this page view only.
    return Math.random() < 0.5 ? "scene" : "control";
  }
}

/** Returns null until the variant is known on the client (avoids a flash of the wrong variant). */
export function useQuest1Variant(): Quest1Variant | null {
  const [variant, setVariant] = useState<Quest1Variant | null>(quest1ExperimentOn ? null : "scene");
  useEffect(() => {
    if (!quest1ExperimentOn) return;
    const v = readOrAssign();
    setGlobalAnalyticsProps({ exp_quest1_scene: v });
    setVariant(v);
  }, []);
  return variant;
}
