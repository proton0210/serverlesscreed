"use client";

import { useEffect, useRef } from "react";
import { useProgress } from "@/components/learn/progress-provider";
import { track } from "@/lib/analytics";

/** Persists completion once a legacy quest's code + quiz modal unlocks. */
export function usePersistQuestCompletion(active: boolean, questSlug: string) {
  const { completeQuest } = useProgress();
  const persisted = useRef(false);

  useEffect(() => {
    track("quest_view", { quest: questSlug });
  }, [questSlug]);

  useEffect(() => {
    if (!active || persisted.current) return;
    persisted.current = true;
    track("quest_complete", { quest: questSlug });
    void completeQuest(questSlug, `dynamodb-stamp-${questSlug}`);
  }, [active, completeQuest, questSlug]);
}
