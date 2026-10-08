"use client";

import { useState, type ReactNode } from "react";
import { Workbench, type RunOutput } from "@/components/learn/lesson/workbench";
import { errorOutput, securityScan } from "@/components/learn/editor-common";
import { track } from "@/lib/analytics";
import { useProgress } from "@/components/learn/progress-provider";

/**
 * Code challenge backed by /api/s3/simulate-quest: scan for credentials, then parse the
 * code and compare its request with the task. No submitted code runs and no AWS call is made.
 */
export function S3CodeEditor({
  questId,
  problemCode,
  solutionCode,
  goal,
  onSuccess,
}: {
  questId: string;
  problemCode: string;
  solutionCode: string;
  goal: ReactNode;
  onSuccess?: () => void;
}) {
  const [code, setCode] = useState(problemCode);
  const [output, setOutput] = useState<RunOutput>(null);
  const [running, setRunning] = useState(false);
  const { learnerId, addStamp } = useProgress();

  const run = async () => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    try {
      const blocked = await securityScan(code);
      if (blocked) return setOutput(blocked);
      const res = await fetch("/api/s3/simulate-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, code, learnerId }),
      });
      const sim = (await res.json()) as { success?: boolean; message?: string; error?: string; data?: unknown; stamp?: string };
      const success = res.ok && Boolean(sim.success);
      track("code_run", { quest: questId, success, failure: sim.error });
      setOutput({
        ok: success,
        title: success ? sim.message ?? "Success" : sim.error ? `${sim.error}` : "Not quite",
        detail: success ? undefined : sim.error ? sim.message?.replace(new RegExp(`^${sim.error}:\\s*`), "") : sim.message,
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

  return (
    <Workbench
      code={code}
      onCode={setCode}
      solution={solutionCode}
      goal={goal}
      running={running}
      onRun={run}
      onReset={() => {
        setCode(problemCode);
        setOutput(null);
      }}
      output={output}
      runLabel="Check solution"
    />
  );
}
