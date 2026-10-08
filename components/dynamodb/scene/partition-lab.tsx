"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { HOT_SHARE, labKeys, labTrace, type LabKey } from "@/lib/dynamodb/partition-lab";
import { dexLabel, findPokemon, typeColor } from "@/lib/dynamodb/pokedex";
import { TEACHING_PARTITIONS } from "@/lib/dynamodb/trace";
import { track } from "@/lib/analytics";
import { useQuest1Variant } from "@/lib/experiments";
import { useTracePlayer } from "./use-trace-player";
import { useInView, useRendererChoice } from "./renderer-choice";
import { TraceScene2D } from "./trace-scene-2d";
import { SceneCaption, SceneControls, SceneSteps, SceneTimeline, sceneShortcuts } from "./scene-controls";
import { WireView } from "./wire-view";

const TraceScene3D = dynamic(() => import("./trace-scene-3d"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-stone-500">Loading 3D scene…</div>,
});

const colorOf = (name: string) => typeColor(name);
const subtitleOf = (name: string) => {
  const p = findPokemon(name);
  return p ? `${dexLabel(p)} · ${p.type1}` : "";
};

/**
 * Quest 1 lab: choose a partition key and watch 24 PutItem requests hash onto partitions.
 * Name spreads evenly; Type1 makes a hot partition; Region can only ever use two partitions.
 */
export function PartitionLab() {
  const variant = useQuest1Variant();
  if (variant !== "scene") return null;
  return <PartitionLabScene />;
}

function PartitionLabScene() {
  const [keyId, setKeyId] = useState<LabKey>("name");
  const [forced2d, setForced2d] = useState(false);
  const choice = useRendererChoice();
  const [stageRef, inView] = useInView<HTMLDivElement>();
  const events = useMemo(() => labTrace(keyId), [keyId]);
  const player = useTracePlayer(events, {
    onComplete: () => track("scene_complete", { quest: "quest-1", source: "lesson", key: keyId }),
  });

  const counts = useMemo(() => {
    const c = Array(TEACHING_PARTITIONS).fill(0) as number[];
    for (let i = 0; i < player.index; i++) {
      const e = events[i];
      if (e.t === "capacity") {
        const w = events[i - 1];
        if (w?.t === "write") c[w.partition]++;
      }
    }
    return c;
  }, [events, player.index]);
  const total = counts.reduce((a, b) => a + b, 0);
  const hot = useMemo(() => counts.flatMap((c, p) => (total >= 8 && c / total > HOT_SHARE ? [p] : [])), [counts, total]);
  const idle = counts.filter((c) => c === 0).length;
  const k = labKeys[keyId];

  let verdict: { tone: "ok" | "hot" | "info"; text: string } = {
    tone: "info",
    text: "Each partition handles up to 1,000 write units and 3,000 read units per second.",
  };
  if (player.done) {
    if (!hot.length)
      verdict = { tone: "ok", text: `${k.attr} works well: every value is unique, so writes spread across all ${TEACHING_PARTITIONS} partitions (at most ${Math.max(...counts)} of ${total} on one).` };
    else if (keyId === "type")
      verdict = {
        tone: "hot",
        text: "Hot partition: all 8 Water Pokémon share the key \"Water\", so they always land together. At scale, Water traffic alone hits the 1,000 WCU per-partition limit and throttles while other partitions sit quiet.",
      };
    else verdict = { tone: "hot", text: `Only 2 distinct values means only 2 partitions can ever be used. ${idle} partitions sit idle and each busy one takes half of all traffic.` };
  }

  const use3d = choice === "3d" && !forced2d;

  return (
    <div className="not-prose mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Partition key">
        <span className="mr-1 text-xs font-bold uppercase tracking-wider text-stone-600">Partition key</span>
        {(Object.keys(labKeys) as LabKey[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={keyId === id}
            onClick={() => {
              setKeyId(id);
              track("scene_play", { quest: "quest-1", source: "lesson", key: id });
            }}
            className={`rounded-lg border px-3 py-1.5 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0e7c6b] ${
              keyId === id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-800 hover:bg-stone-100"
            }`}
          >
            {labKeys[id].label}
            <span className={`block font-mono text-[10.5px] font-normal ${keyId === id ? "text-stone-300" : "text-stone-500"}`}>{labKeys[id].hint}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div
          ref={stageRef}
          role="group"
          tabIndex={0}
          onKeyDown={sceneShortcuts(player)}
          aria-label="Partition lab. Space plays or pauses; arrow keys step."
          className="overflow-hidden rounded-2xl border border-[var(--sc-line)] bg-gradient-to-b from-white to-[#f3f0e8] shadow-[var(--sc-shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0e7c6b]"
          style={{ aspectRatio: use3d ? "16 / 10" : undefined }}
        >
          {use3d ? (
            inView ? (
              <TraceScene3D events={events} index={player.index} stepMs={player.stepMs} hot={hot} color={colorOf} subtitle={subtitleOf} onSlow={() => setForced2d(true)} />
            ) : null
          ) : (
            <TraceScene2D events={events} index={player.index} stepMs={player.stepMs} compact={{ color: colorOf, hot }} className="block h-auto w-full" />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <SceneTimeline player={player} events={events} />
          <SceneControls player={player} total={events.length} />
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-600">Writes per partition</p>
            <ul className="flex flex-col gap-2">
              {counts.map((c, p) => {
                const isHot = hot.includes(p);
                return (
                  <li key={p} className="grid grid-cols-[2.25rem_1fr_4.5rem] items-center gap-2 text-sm tabular-nums">
                    <span className="font-mono font-semibold">P{p}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                      <span className={`block h-full rounded-full transition-all ${isHot ? "bg-red-600" : "bg-stone-800"}`} style={{ width: `${(c / 12) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold">
                      {c}
                      {isHot && <span className="ml-1 rounded bg-red-100 px-1 text-[10px] font-bold uppercase text-red-700">Hot</span>}
                      {player.done && c === 0 && <span className="ml-1 rounded border border-stone-300 px-1 text-[10px] font-bold uppercase text-stone-500">Idle</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p
              className={`mt-3 rounded-lg border-l-4 px-3 py-2 text-sm font-medium ${
                verdict.tone === "ok" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : verdict.tone === "hot" ? "border-red-600 bg-red-50 text-red-900" : "border-stone-300 bg-stone-50 text-stone-700"
              }`}
            >
              {verdict.text}
            </p>
          </div>
        </div>
      </div>

      <SceneCaption events={events} event={player.current} index={player.index} total={events.length} idleText={`Partition key: ${k.attr}${k.sortKey ? " with Name as sort key" : ""}. Press Play to send 24 PutItem requests.`} />
      <WireView events={events} index={player.index} />
      <SceneSteps events={events} />
      <p className="text-xs text-stone-600">
        Teaching model: 4 partitions and a stand-in hash function. DynamoDB manages partitions itself, and adaptive capacity shifts throughput toward busy partitions, but a single partition key value still cannot exceed 1,000 WCU or 3,000 RCU per second.
      </p>
    </div>
  );
}

export default PartitionLab;
