"use client";

import { SimulateCodeEditor } from "@/components/dynamodb/simulate-code-editor";

type Props = { problemCode: string; solutionCode: string; onSuccess?: () => void };

export function UpdateItemCodeEditor({ problemCode, solutionCode, onSuccess }: Props) {
  return (
    <SimulateCodeEditor
      questId="quest-6"
      problemCode={problemCode}
      solutionCode={solutionCode}
      onSuccess={onSuccess}
      goalHint={<>Use <code>UpdateExpression</code> to set Mew&apos;s <code>Level</code> to 6.</>}
      formatData={(d) => (d as { updatedAttributes?: unknown }).updatedAttributes ?? d}
    />
  );
}
