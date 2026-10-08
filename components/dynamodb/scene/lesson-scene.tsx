"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { lessonSequence, predictionPauseIndex } from "@/lib/dynamodb/lesson-traces";
import { quizAttempt, track } from "@/lib/analytics";
import { useTracePlayer } from "./use-trace-player";
import { useInView, useRendererChoice } from "./renderer-choice";
import { TraceScene2D } from "./trace-scene-2d";
import { SceneCaption, SceneControls, SceneSteps, SceneTimeline, sceneShortcuts } from "./scene-controls";
import { WireView } from "./wire-view";

const TraceScene3D = dynamic(() => import("./trace-scene-3d"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-stone-500">Loading 3D scene…</div>,
});

/**
 * Lesson animation: plays the failure, then the fix, once when scrolled into view
 * (no autoplay with reduced motion). Optional prediction pauses before the reveal.
 */
export function LessonScene({ questId }: { questId: string }) {
  const sequence = useMemo(() => lessonSequence(questId), [questId]);
  const [step, setStep] = useState(0);
  const [autoRun, setAutoRun] = useState(false);
  const [chained, setChained] = useState(true);
  const [forced2d, setForced2d] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const choice = useRendererChoice();
  const [ref, inView] = useInView<HTMLDivElement>();

  const steps = useMemo(() => sequence?.steps ?? [], [sequence]);
  const events = useMemo(() => steps[step]?.events ?? [], [steps, step]);
  const predict = sequence?.predict;
  const pauseAt = predict && predict.step === step ? predictionPauseIndex(events, predict) : -1;

  const player = useTracePlayer(events, {
    autoplay: autoRun,
    onComplete: () => {
      track("scene_complete", { quest: questId, source: "lesson", step });
      if (chained && step < steps.length - 1) setTimeout(() => setStep((s) => s + 1), 1200);
      else setChained(false);
    },
  });

  // Start once, when the scene first scrolls into view.
  useEffect(() => {
    if (inView && !autoRun) {
      setAutoRun(true);
      track("scene_play", { quest: questId, source: "lesson" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  // Pause for the prediction before the reveal.
  const waiting = pauseAt >= 0 && answer === null && player.index === pauseAt;
  useEffect(() => {
    if (waiting && player.playing) player.pause();
  }, [waiting, player]);

  if (!sequence) return null;
  const use3d = sequence.threeD && choice === "3d" && !forced2d;

  const choose = (i: number) => {
    setStep(i);
    setChained(false);
    setAutoRun(true);
  };

  return (
    <div ref={ref} role="region" className="mt-5 flex flex-col gap-3" aria-label="Lesson animation">
      {steps.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Scenario">
          {steps.map((s, i) => (
            <button
              key={s.label}
              type="button"
              role="tab"
              aria-selected={step === i}
              onClick={() => choose(i)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0e7c6b] ${
                step === i ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span aria-hidden className={`mr-1.5 inline-block h-2 w-2 rounded-full ${s.tone === "fail" ? "bg-red-500" : s.tone === "fix" ? "bg-emerald-500" : "bg-stone-400"}`} />
              {s.tone === "fail" ? "Without: " : s.tone === "fix" ? "With: " : ""}
              {s.label}
            </button>
          ))}
        </div>
      )}
      <div
        role="group"
        tabIndex={0}
        onKeyDown={sceneShortcuts(player)}
        aria-label="Lesson scene. Space plays or pauses; arrow keys step."
        className="relative overflow-hidden rounded-2xl border border-[var(--sc-line)] bg-gradient-to-b from-white to-[#f3f0e8] shadow-[var(--sc-shadow-sm)] shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0e7c6b]"
        style={{ aspectRatio: use3d ? "16 / 10" : undefined }}
      >
        {use3d ? (
          <TraceScene3D events={events} index={player.index} stepMs={player.stepMs} onSlow={() => setForced2d(true)} />
        ) : (
          <TraceScene2D events={events} index={player.index} stepMs={player.stepMs} className="block h-auto w-full" />
        )}
        {waiting && predict && (
          <div className="absolute inset-0 grid place-items-center bg-white/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-stone-300 bg-white p-4 shadow-lg" role="dialog" aria-label="Predict what happens">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0e7c6b]">Predict what happens</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{predict.question}</p>
              <div className="mt-3 flex flex-col gap-2">
                {predict.options.map((o, i) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      setAnswer(i);
                      track("quiz_answer", { quest: questId, source: "predict", correct: i === predict.answerIndex, attempt: quizAttempt(`${questId}-predict`) });
                      player.play();
                    }}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0e7c6b]"
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {predict && answer !== null && predict.step === step && (
        <p className={`rounded-lg border-l-4 px-3 py-2 text-sm font-medium ${answer === predict.answerIndex ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-amber-500 bg-amber-50 text-amber-900"}`}>
          {answer === predict.answerIndex ? "Right. " : `Not quite: the answer is "${predict.options[predict.answerIndex]}". `}
          {predict.explain}
        </p>
      )}
      <SceneTimeline player={player} events={events} />
      <SceneControls player={player} total={events.length} />
      <SceneCaption events={events} event={player.current} index={player.index} total={events.length} idleText="This animation plays when you scroll to it. Press Play to start it now." />
      <WireView events={events} index={player.index} />
      <SceneSteps events={events} />
    </div>
  );
}

export default LessonScene;
