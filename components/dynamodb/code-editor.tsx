"use client";

import { useState } from "react";
import { TraceReplay, type TraceResult } from "@/components/dynamodb/scene/trace-replay";
import { Workbench, type RunOutput } from "@/components/learn/lesson/workbench";
import { errorOutput, failure, securityScan } from "@/components/learn/editor-common";
import { track } from "@/lib/analytics";
import { useProgress } from "@/components/learn/progress-provider";

type CodeEditorProps = {
  problemCode: string;
  solutionCode: string;
  onSuccess?: () => void;
};

/** 1-based line holding `TableName:` (the only line the learner edits in Quest 3). */
export const findTableNameLine = (code: string): number | null => {
  const i = code.split("\n").findIndex((line) => !line.trim().startsWith("//") && /\bTableName\b\s*:/.test(line));
  return i < 0 ? null : i + 1;
};

/** Quest 3: Scan the Pokemon table through the deterministic emulator. */
export function CodeEditor({ problemCode, solutionCode, onSuccess }: CodeEditorProps) {
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
      const table = code.match(/TableName\s*:\s*["']?([^"',\s}]+)["']?/i)?.[1]?.trim();
      if (!table) return setOutput(failure("TableName is missing", 'Set TableName to "Pokemon" and run again.'));
      if (table !== "Pokemon") return setOutput(failure(`TableName is "${table}"`, 'This challenge scans the "Pokemon" table. Change TableName and run again.'));

      const blocked = await securityScan(code);
      if (blocked) return setOutput(blocked);

      const res = await fetch("/api/dynamodb/emulate-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, learnerId }),
      });
      const scan = await res.json();
      if (!res.ok) return setOutput(failure("Scan could not run", scan.error || scan.message || "Unknown error"));
      setTrace(scan);
      track("code_run", { quest: "quest-3", success: Boolean(scan.success), failure: scan.failure });
      setOutput({
        ok: true,
        title: `Scan returned ${scan.count} Pokémon`,
        detail: `DynamoDB examined ${scan.scannedCount} items to build this page.${scan.lastEvaluatedKey ? " More items remain: pass LastEvaluatedKey as ExclusiveStartKey to read the next page." : ""} Simulated — no AWS request was made.`,
        data: scan.items?.length ? JSON.stringify(scan.items, null, 2) : undefined,
      });
      addStamp(scan.stamp);
      onSuccess?.();
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
      goal={<>Only the <code>TableName</code> line is editable. Point it at <code>&quot;Pokemon&quot;</code>.</>}
      editableLine={findTableNameLine(code)}
      running={running}
      onRun={run}
      onReset={() => {
        setCode(problemCode);
        setOutput(null);
        setTrace(null);
      }}
      output={output}
      after={<TraceReplay questId="quest-3" result={trace} />}
    />
  );
}
