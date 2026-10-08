"use client";

import { useCallback, useId, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { TracePlayer } from "./use-trace-player";
import { captionFor } from "@/lib/dynamodb/captions";
import { findPokemon } from "@/lib/dynamodb/pokedex";
import { CritterIcon, critterName, type CritterMood } from "./critter-svg";
import type { TraceEvent } from "@/lib/dynamodb/trace";

const base =
  "rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition duration-150 ease-out active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e7c6b] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100";
const btn = `${base} border-stone-300 bg-white text-stone-800 hover:-translate-y-px hover:border-stone-400 hover:shadow`;
const primary = `${base} min-w-[4.5rem] border-[#16140f] bg-[#16140f] text-white hover:-translate-y-px hover:bg-black hover:shadow-md`;

const TICK: Record<TraceEvent["t"], string> = {
  request: "bg-cyan-600",
  hash: "bg-indigo-500",
  condition: "bg-violet-500",
  read: "bg-blue-500",
  write: "bg-amber-500",
  capacity: "bg-stone-400",
  page: "bg-teal-500",
  retry: "bg-orange-500",
  rollback: "bg-red-600",
  expire: "bg-stone-500",
  response: "bg-emerald-600",
};

/** Seekable timeline: one tick per event, drag or click to scrub, arrow keys to step. */
export function SceneTimeline({ player, events }: { player: TracePlayer; events: TraceEvent[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const total = events.length;
  const toIndex = useCallback(
    (clientX: number) => {
      const r = trackRef.current!.getBoundingClientRect();
      return Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * total);
    },
    [total],
  );
  const onPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    else if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    player.seek(toIndex(e.clientX));
  };
  const onKey = (e: ReactKeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: player.index + 1, ArrowUp: player.index + 1, ArrowLeft: player.index - 1, ArrowDown: player.index - 1, Home: 0, End: total, PageUp: player.index + 5, PageDown: player.index - 5 };
    if (e.key in map) {
      e.preventDefault();
      player.seek(map[e.key]);
    }
  };
  const pct = total ? (player.index / total) * 100 : 0;
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Scene timeline"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={player.index}
      aria-valuetext={`Step ${player.index} of ${total}${player.current ? `, ${player.current.t}` : ""}`}
      onPointerDown={onPointer}
      onPointerMove={onPointer}
      onKeyDown={onKey}
      className="group relative h-6 cursor-pointer touch-none select-none rounded-full px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e7c6b]"
    >
      <div ref={trackRef} className="relative h-full">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-gradient-to-r from-[#0e7c6b] to-[#13a58e]" style={{ width: `${pct}%`, transition: player.playing ? `width ${player.stepMs}ms linear` : "width 120ms ease-out" }} />
        </div>
        {total <= 60 &&
          events.map((e, i) => (
            <span
              key={i}
              aria-hidden
              className={`absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded-full ${TICK[e.t]} ${i < player.index ? "opacity-90" : "opacity-40"}`}
              style={{ left: `${((i + 1) / total) * 100}%` }}
            />
          ))}
        <span
          aria-hidden
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0e7c6b] shadow-md ring-1 ring-black/10 transition-transform group-hover:scale-110"
          style={{ left: `${pct}%`, transition: player.playing ? `left ${player.stepMs}ms linear` : "left 120ms ease-out" }}
        />
      </div>
    </div>
  );
}

/** Space plays/pauses, arrows step, Home/End jump. Attach to a scene container's onKeyDown. */
export function sceneShortcuts(player: TracePlayer) {
  return (e: ReactKeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("button, select, input, textarea, [role=slider], [role=tab], pre")) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      player.toggle();
    } else if (e.key === "ArrowRight" || e.key === "l") player.seek(player.index + 1);
    else if (e.key === "ArrowLeft" || e.key === "j") player.seek(player.index - 1);
    else if (e.key === "Home") player.restart();
    else if (e.key === "End") player.finish();
  };
}

export function SceneControls({ player, total }: { player: TracePlayer; total: number }) {
  const speedId = useId();
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Scene controls">
      <button type="button" onClick={player.toggle} className={primary}>
        {player.playing ? "Pause" : player.done ? "Replay" : player.index > 0 ? "Resume" : "Play"}
      </button>
      <button type="button" onClick={player.step} disabled={player.playing || player.done} className={btn}>
        Step
      </button>
      <button type="button" onClick={player.finish} disabled={player.done} className={btn}>
        Skip to end
      </button>
      <button type="button" onClick={player.restart} disabled={player.index === 0} className={btn}>
        Restart
      </button>
      <label className="sr-only" htmlFor={speedId}>
        Playback speed
      </label>
      <select
        id={speedId}
        value={player.speed}
        onChange={(e) => player.setSpeed(Number(e.target.value))}
        className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-stone-800"
      >
        {[0.5, 1, 2, 4].map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
      <span className="ml-auto hidden font-mono text-[11px] text-stone-600 sm:inline" aria-hidden>
        Space play · ← → step
      </span>
    </div>
  );
}

/** The Pokémon a trace event is about, if any. */
function subjectOf(e: TraceEvent): string | undefined {
  if (e.t === "request") return e.key ? String(e.key.Name ?? Object.values(e.key)[0]) : undefined;
  if (e.t === "write" || e.t === "expire") return e.item;
  if (e.t === "read") return e.items[0];
  if (e.t === "hash") return e.key;
  if (e.t === "retry") return e.keys[0];
  return undefined;
}

/** How the guide critter feels about the current step. */
function moodFor(events: TraceEvent[], index: number): CritterMood {
  const e = events[index - 1];
  if (!e) return "idle";
  const lostSoFar = events.slice(0, index).some((x) => x.t === "write" && x.lost);
  if ((e.t === "write" && e.lost) || (e.t === "condition" && !e.pass) || e.t === "rollback" || e.t === "retry") return "worried";
  if (e.t === "response") return e.ok && !lostSoFar ? "happy" : "worried";
  if (e.t === "expire" && e.visible) return "worried";
  if (e.t === "read" || e.t === "hash" || e.t === "condition") return "curious";
  if (e.t === "write") return "happy";
  return "idle";
}

export function SceneCaption({ event, index, total, idleText, events }: { event?: TraceEvent; index: number; total: number; idleText: string; events?: TraceEvent[] }) {
  // The guide is the Data Critter of the Pokémon this step is about (or the most recent one).
  let type: string | undefined;
  if (events) {
    for (let i = Math.min(index, events.length) - 1; i >= 0 && !type; i--) {
      const name = subjectOf(events[i]);
      type = name ? findPokemon(name)?.type1 : undefined;
    }
    if (!type) for (const e of events) if (!type) type = findPokemon(subjectOf(e) ?? "")?.type1;
  }
  const mood = events ? moodFor(events, index) : "idle";
  return (
    <div className="flex min-h-[3.5rem] items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
      {type && (
        <span key={`${index}-${mood}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-stone-200">
          <CritterIcon type={type} mood={mood} size={34} />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-mono text-[11px] text-stone-600">
          {event ? `Step ${index} of ${total} · ${event.t}` : `Ready · ${total} steps`}
          {type ? ` · ${critterName(type)}` : ""}
        </p>
        <p className="mt-0.5 text-sm font-medium text-stone-800" aria-live="polite">
          {event ? captionFor(event) : idleText}
        </p>
      </div>
    </div>
  );
}

/** Full list of steps, for reading at your own pace or with a screen reader. */
export function SceneSteps({ events }: { events: TraceEvent[] }) {
  return (
    <details className="rounded-lg border border-stone-200 bg-white">
      <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-stone-700">All steps as text</summary>
      <ol className="list-decimal space-y-1 border-t border-stone-200 py-3 pl-9 pr-4 text-xs text-stone-700">
        {events.map((e, i) => (
          <li key={i}>{captionFor(e)}</li>
        ))}
      </ol>
    </details>
  );
}
