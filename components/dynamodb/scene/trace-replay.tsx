"use client";

import { useEffect, useMemo, useState } from "react";
import type { Failure, TraceEvent } from "@/lib/dynamodb/trace";
import { failureTitles } from "@/lib/dynamodb/captions";
import { track } from "@/lib/analytics";
import { useTracePlayer } from "./use-trace-player";
import { TraceScene2D } from "./trace-scene-2d";
import { ArchitectureBoard, type BoardCheck } from "./architecture-board";
import { SceneCaption, SceneControls, SceneSteps, SceneTimeline, sceneShortcuts } from "./scene-controls";
import { WireView } from "./wire-view";

export type TraceResult = {
  trace?: TraceEvent[];
  /** Quest 16: per-decision results for the architecture board. */
  checks?: BoardCheck[];
  failure?: Failure;
  counterfactual?: TraceEvent[];
};

/**
 * Replays the trace returned by a simulator run beside the JSON output.
 * If the response carries a counterfactual, "What if I skipped this?" swaps to it.
 */
export function TraceReplay({ questId, result }: { questId: string; result: TraceResult | null }) {
  const [view, setView] = useState<"run" | "whatif">("run");
  useEffect(() => setView("run"), [result]);

  const events = useMemo(() => {
    if (!result) return [] as TraceEvent[];
    return view === "whatif" ? result.counterfactual ?? [] : result.trace ?? [];
  }, [result, view]);

  const player = useTracePlayer(events, {
    autoplay: true,
    onComplete: () => track("scene_complete", { quest: questId, source: view === "whatif" ? "whatif" : "run" }),
  });

  useEffect(() => {
    if (events.length) track("scene_play", { quest: questId, source: view === "whatif" ? "whatif" : "run" });
  }, [events, questId, view]);

  if (result?.checks?.length) {
    return (
      <section className="rounded-[20px] border border-[var(--sc-line)] bg-white p-4 shadow-[var(--sc-shadow-sm)] sm:p-5" aria-label="What DynamoDB did">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Your production architecture</h3>
        <ArchitectureBoard checks={result.checks} />
      </section>
    );
  }
  if (!result?.trace?.length) return null;
  const failed = Boolean(result.failure);
  const canWhatIf = Boolean(result.counterfactual?.length);

  return (
    <section className="rounded-[20px] border border-[var(--sc-line)] bg-white p-4 shadow-[var(--sc-shadow-sm)] sm:p-5" aria-label="What DynamoDB did">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-900">
          {view === "whatif" ? "What if you skipped this?" : failed ? `What went wrong: ${failureTitles[result.failure!]}` : "What DynamoDB did"}
        </h3>
        {canWhatIf && (
          <div className="inline-flex rounded-lg border border-stone-300 p-0.5 text-xs font-semibold" role="tablist" aria-label="Scene to show">
            <button
              type="button"
              role="tab"
              aria-selected={view === "run"}
              onClick={() => setView("run")}
              className={`rounded-md px-3 py-1 ${view === "run" ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"}`}
            >
              Your code
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "whatif"}
              onClick={() => {
                setView("whatif");
                track("whatif_click", { quest: questId });
              }}
              className={`rounded-md px-3 py-1 ${view === "whatif" ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"}`}
            >
              What if I skipped this?
            </button>
          </div>
        )}
      </div>
      <div
        role="group"
        tabIndex={0}
        onKeyDown={sceneShortcuts(player)}
        aria-label="Scene. Space plays or pauses; arrow keys step."
        className="overflow-hidden rounded-2xl border border-[var(--sc-line)] bg-gradient-to-b from-white to-[#f7f5ef] shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0e7c6b]"
      >
        <TraceScene2D events={events} index={player.index} stepMs={player.stepMs} className="block h-auto w-full" />
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <SceneTimeline player={player} events={events} />
        <SceneControls player={player} total={events.length} />
        <SceneCaption events={events} event={player.current} index={player.index} total={events.length} idleText="Press Play to watch the request." />
        <WireView events={events} index={player.index} defaultOpen />
        <SceneSteps events={events} />
      </div>
    </section>
  );
}
