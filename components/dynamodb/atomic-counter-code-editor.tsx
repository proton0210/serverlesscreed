"use client";

import { SimulateCodeEditor } from "@/components/dynamodb/simulate-code-editor";

type Props = { problemCode: string; solutionCode: string; onSuccess?: () => void };

export function AtomicCounterCodeEditor({ problemCode, solutionCode, onSuccess }: Props) {
  return (
    <SimulateCodeEditor
      questId="quest-7"
      problemCode={problemCode}
      solutionCode={solutionCode}
      onSuccess={onSuccess}
      goalHint={<>Use <code>ADD</code> in <code>UpdateExpression</code> to increment <code>BattlesWon</code> by 1.</>}
      formatData={(d) => (d as { updatedAttributes?: unknown }).updatedAttributes ?? d}
    />
  );
}
