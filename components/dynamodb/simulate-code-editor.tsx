"use client";

import { useState, type ReactNode } from "react";
import { TraceReplay, type TraceResult } from "@/components/dynamodb/scene/trace-replay";
import { Workbench, toOutput, type RunOutput } from "@/components/learn/lesson/workbench";
import { errorOutput, securityScan } from "@/components/learn/editor-common";
import { track } from "@/lib/analytics";
import { useProgress } from "@/components/learn/progress-provider";

type SimulateCodeEditorProps = {
  /** Which quest handler in /api/dynamodb/simulate-quest to validate against (e.g. "quest-9"). */
  questId: string;
  problemCode: string;
  solutionCode: string;
  /** Short goal shown above the editor. */
  goalHint: ReactNode;
  onSuccess?: () => void;
  /** Formats the simulator's `data` for the result panel. */
  formatData?: (data: unknown) => unknown;
};

/**
 * Code challenge backed by /api/dynamodb/simulate-quest: scan the code for credentials,
 * then validate its request shape. No submitted code runs and no AWS call is made.
 */
export function SimulateCodeEditor({ questId, problemCode, solutionCode, goalHint, onSuccess, formatData }: SimulateCodeEditorProps) {
  const [code, setCode] = useState(problemCode);
  const [output, setOutput] = useState<RunOutput>(null);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [running, setRunning] = useState(false);
  const { learnerId, addStamp } = useProgress();

  const run = async () => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    setTrace(null);
    try {
      const blocked = await securityScan(code);
      if (blocked) return setOutput(blocked);
      const res = await fetch("/api/dynamodb/simulate-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, code, learnerId }),
      });
      const sim = await res.json();
      setTrace(sim);
      track("code_run", { quest: questId, success: Boolean(sim.success), failure: sim.failure });
      if (!res.ok) return setOutput(toOutput(sim.message || sim.error || "Simulation failed", false));
      const out = toOutput(String(sim.message ?? ""), Boolean(sim.success));
      const data = sim.success && sim.data != null ? (formatData ? formatData(sim.data) : sim.data) : undefined;
      setOutput(out && data != null ? { ...out, data: JSON.stringify(data, null, 2) } : out);
      if (sim.success) {
        addStamp(sim.stamp);
        onSuccess?.();
      }
    } catch (error) {
      setOutput(errorOutput(error));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Workbench
      code={code}
      onCode={setCode}
      solution={solutionCode}
      goal={goalHint}
      running={running}
      onRun={run}
      onReset={() => {
        setCode(problemCode);
        setOutput(null);
        setTrace(null);
      }}
      output={output}
      runLabel="Check solution"
      after={<TraceReplay questId={questId} result={trace} />}
    />
  );
}

export default SimulateCodeEditor;
