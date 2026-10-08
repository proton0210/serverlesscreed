"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Workbench, type RunOutput } from "@/components/learn/lesson/workbench";
import { CODE_LANGUAGES, LANGUAGE_LABEL, useCodeLanguage, type CodeLanguage } from "@/components/learn/lesson/code-language";
import { errorOutput, securityScan } from "@/components/learn/editor-common";
import { track } from "@/lib/analytics";
import { useProgress } from "@/components/learn/progress-provider";
import type { CdkExercise } from "@/lib/cdk/exercises";

/**
 * Code challenge backed by /api/cdk/simulate-quest. The learner picks TypeScript or Python; each language keeps its own
 * draft. Nothing runs: the server parses the code, simulates the construct tree and synthesizes the template.
 */
export function CdkCodeEditor({ questId, exercise, goal, onSuccess }: { questId: string; exercise: CdkExercise; goal: ReactNode; onSuccess?: () => void }) {
  const [language, setLanguage] = useCodeLanguage();
  const [drafts, setDrafts] = useState<Record<CodeLanguage, string>>({ typescript: exercise.typescript.problemCode, python: exercise.python.problemCode });
  const [output, setOutput] = useState<RunOutput>(null);
  const [running, setRunning] = useState(false);
  const { learnerId, addStamp } = useProgress();
  const code = drafts[language];
  const draftKey = (l: CodeLanguage) => `serverlesscreed:cdk:draft:${questId}:${l}`;

  // Restore drafts after hydration. Storage can be blocked, so every access is guarded.
  useEffect(() => {
    try {
      const restored = { ...drafts };
      for (const l of CODE_LANGUAGES) {
        const saved = window.localStorage.getItem(draftKey(l));
        if (saved) restored[l] = saved;
      }
      setDrafts(restored);
    } catch {
      /* no storage: drafts last for this page view */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  const saveDraft = (l: CodeLanguage, value: string, initial: string) => {
    try {
      if (value === initial) window.localStorage.removeItem(draftKey(l));
      else window.localStorage.setItem(draftKey(l), value);
    } catch {
      /* ignore */
    }
  };
  const current = useRef(language);
  current.current = language;

  const run = async () => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    const startedIn = language;
    try {
      const blocked = await securityScan(code);
      if (blocked) return setOutput(blocked);
      const res = await fetch("/api/cdk/simulate-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, code, language, learnerId }),
      });
      const sim = (await res.json()) as { success?: boolean; message?: string; error?: string; data?: unknown; stamp?: string };
      const success = res.ok && Boolean(sim.success);
      const stale = current.current !== startedIn; // the learner switched language while this ran
      track("code_run", { quest: questId, success, failure: sim.error, language });
      if (!stale) setOutput({
        ok: success,
        title: success ? sim.message ?? "Success" : sim.error ?? "Not quite",
        detail: success ? undefined : sim.message,
        data: success && sim.data != null ? JSON.stringify(sim.data, null, 2) : undefined,
      });
      if (success) {
        addStamp(sim.stamp);
        onSuccess?.();
      }
    } catch (error) {
      setOutput(errorOutput(error));
    } finally {
      setRunning(false);
    }
  };

  const switcher = (
    <div role="group" aria-label="Language" className="flex rounded-xl bg-white/[0.05] p-1">
      {CODE_LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={language === l}
          onClick={() => {
            setLanguage(l);
            setOutput(null);
          }}
          className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition ${language === l ? "bg-white/[0.12] text-white" : "text-white/55 hover:text-white/85"}`}
        >
          {LANGUAGE_LABEL[l]}
        </button>
      ))}
    </div>
  );

  return (
    <Workbench
      code={code}
      onCode={(c) => {
        setDrafts((d) => ({ ...d, [language]: c }));
        saveDraft(language, c, exercise[language].problemCode);
      }}
      solution={exercise[language].solutionCode}
      goal={goal}
      running={running}
      onRun={run}
      onReset={() => {
        setDrafts((d) => ({ ...d, [language]: exercise[language].problemCode }));
        saveDraft(language, exercise[language].problemCode, exercise[language].problemCode);
        setOutput(null);
      }}
      output={output}
      after={<p className="mt-3 text-[12.5px] leading-relaxed text-[var(--sc-ink-3)]">The simulator runs the constructs this course teaches, plus simple loops and helper methods. Other CDK code may not be recognised.</p>}
      runLabel="Check solution"
      language={language}
      headerExtra={switcher}
    />
  );
}
