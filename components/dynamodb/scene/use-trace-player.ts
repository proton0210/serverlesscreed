"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TraceEvent, TraceEventType } from "@/lib/dynamodb/trace";

/** Base duration per event type at 1× speed, in ms. */
export const EVENT_MS: Record<TraceEventType, number> = {
  request: 550,
  hash: 650,
  condition: 800,
  read: 750,
  write: 750,
  capacity: 300,
  page: 650,
  retry: 1000,
  rollback: 1000,
  expire: 1000,
  response: 650,
};

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export type TracePlayer = {
  /** Number of events applied so far (0 = nothing shown yet). */
  index: number;
  playing: boolean;
  done: boolean;
  speed: number;
  /** Duration of the step that is currently animating, already divided by speed. */
  stepMs: number;
  current: TraceEvent | undefined;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  step: () => void;
  finish: () => void;
  restart: () => void;
  /** Jump to a step (0 = before the first event) and pause. */
  seek: (index: number) => void;
  setSpeed: (speed: number) => void;
};

/**
 * Steps through a trace. Renderers read `index` and `stepMs` and animate the
 * event at `index - 1`; a jump of more than one event means "redraw instantly".
 */
export function useTracePlayer(
  events: TraceEvent[],
  { autoplay = false, durations = EVENT_MS, onComplete }: { autoplay?: boolean; durations?: Record<TraceEventType, number>; onComplete?: () => void } = {},
): TracePlayer {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // New trace: rewind, and autoplay if asked (reduced motion jumps to the end instead).
  useEffect(() => {
    clear();
    if (autoplay && reduced) {
      setIndex(events.length);
      setPlaying(false);
    } else {
      setIndex(0);
      setPlaying(autoplay && events.length > 0);
    }
  }, [events, autoplay, reduced]);

  const stepMs = reduced ? 0 : Math.round((durations[events[Math.max(0, index - 1)]?.t ?? "response"] ?? 500) / speed);

  useEffect(() => {
    if (!playing) return;
    if (index >= events.length) {
      setPlaying(false);
      return;
    }
    const wait = index === 0 ? 150 : stepMs;
    timer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, events.length)), wait);
    return clear;
  }, [playing, index, events.length, stepMs]);

  const done = events.length > 0 && index >= events.length;
  const wasDone = useRef(false);
  useEffect(() => {
    if (done && !wasDone.current) completeRef.current?.();
    wasDone.current = done;
  }, [done]);

  const play = useCallback(() => {
    if (index >= events.length) setIndex(0);
    setPlaying(true);
  }, [index, events.length]);
  const pause = useCallback(() => {
    clear();
    setPlaying(false);
  }, []);

  return {
    index,
    playing,
    done,
    speed,
    stepMs,
    current: index > 0 && index <= events.length ? events[index - 1] : undefined,
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    step: () => {
      clear();
      setPlaying(false);
      setIndex((i) => Math.min(i + 1, events.length));
    },
    finish: () => {
      clear();
      setPlaying(false);
      setIndex(events.length);
    },
    restart: () => {
      clear();
      setIndex(0);
      setPlaying(false);
    },
    seek: (i: number) => {
      clear();
      setPlaying(false);
      setIndex(Math.max(0, Math.min(events.length, i)));
    },
    setSpeed,
  };
}
