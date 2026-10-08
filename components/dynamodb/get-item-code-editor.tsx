"use client";

import { useState } from "react";
import { TraceReplay, type TraceResult } from "@/components/dynamodb/scene/trace-replay";
import { Workbench, type RunOutput } from "@/components/learn/lesson/workbench";
import { errorOutput, failure, securityScan } from "@/components/learn/editor-common";
import { track } from "@/lib/analytics";
import { useProgress } from "@/components/learn/progress-provider";

type GetItemCodeEditorProps = {
  problemCode: string;
  solutionCode: string;
  onSuccess?: () => void;
};

const STARTERS = ["Bulbasaur", "Charmander", "Squirtle"];

/** 1-based line holding `Name:` inside the `Key` object (the only editable line in Quest 4). */
export const findKeyNameLine = (code: string): number | null => {
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("//") || !/\bName\b\s*:/.test(lines[i])) continue;
    for (let j = i; j >= 0; j--) {
      if (lines[j].includes("Key:")) return i + 1;
      if (lines[j].includes("}") && !lines[j].includes("{")) break;
    }
  }
  return null;
};

/** Quest 4: fetch a starter with GetItem through the deterministic emulator. */
export function GetItemCodeEditor({ problemCode, solutionCode, onSuccess }: GetItemCodeEditorProps) {
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
      if (table !== "Pokemon") return setOutput(failure(table ? `TableName is "${table}"` : "TableName is missing", 'This challenge reads from the "Pokemon" table.'));
      const name = code.match(/Key\s*:\s*\{[^}]*Name\s*:\s*["']?([^"',\s}]+)["']?/i)?.[1]?.trim();
      if (!name) return setOutput(failure("Key.Name is missing", `Set Key.Name to one of: ${STARTERS.join(", ")}.`));
      if (!STARTERS.includes(name)) return setOutput(failure(`"${name}" isn't a starter`, `Choose ${STARTERS.join(", ")} — names are case-sensitive.`));

      const blocked = await securityScan(code);
      if (blocked) return setOutput(blocked);

      const res = await fetch("/api/dynamodb/emulate-get-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, learnerId }),
      });
      const got = await res.json();
      if (!res.ok) return setOutput(failure("GetItem could not run", got.error || got.message || "Unknown error"));
      setTrace(got);
      track("code_run", { quest: "quest-4", success: Boolean(got.success ?? got.found), failure: got.failure });
      if (got.found && got.item) {
        setOutput({
          ok: true,
          title: `${got.pokemonName} is your partner!`,
          detail: "One GetItem, one partition, one item — 0.5 RCU with eventual consistency. Simulated — no AWS request was made.",
          data: JSON.stringify(got.item, null, 2),
        });
        addStamp(got.stamp);
        onSuccess?.();
      } else {
        setOutput(failure(`${got.pokemonName} was not found`, "GetItem returns no Item when the key doesn't match exactly."));
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
      goal={<>Only the <code>Name</code> line inside <code>Key</code> is editable. Pick your starter.</>}
      editableLine={findKeyNameLine(code)}
      running={running}
      onRun={run}
      onReset={() => {
        setCode(problemCode);
        setOutput(null);
        setTrace(null);
      }}
      output={output}
      after={<TraceReplay questId="quest-4" result={trace} />}
    />
  );
}
