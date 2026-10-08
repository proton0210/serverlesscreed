"use client";

import { SimulateCodeEditor } from "@/components/dynamodb/simulate-code-editor";

type Props = { problemCode: string; solutionCode: string; onSuccess?: () => void };

export function DeleteItemCodeEditor({ problemCode, solutionCode, onSuccess }: Props) {
  return (
    <SimulateCodeEditor
      questId="quest-8"
      problemCode={problemCode}
      solutionCode={solutionCode}
      onSuccess={onSuccess}
      goalHint={<>Use <code>DeleteCommand</code> with a <code>ConditionExpression</code> to remove Mew safely.</>}
      formatData={() => undefined}
    />
  );
}
