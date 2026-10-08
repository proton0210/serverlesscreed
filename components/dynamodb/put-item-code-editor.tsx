"use client";

import { SimulateCodeEditor } from "@/components/dynamodb/simulate-code-editor";

type Props = { problemCode: string; solutionCode: string; onSuccess?: () => void };

export function PutItemCodeEditor({ problemCode, solutionCode, onSuccess }: Props) {
  return (
    <SimulateCodeEditor
      questId="quest-5"
      problemCode={problemCode}
      solutionCode={solutionCode}
      onSuccess={onSuccess}
      goalHint={<>Add a <code>ConditionExpression</code> so the put fails if <code>Name</code> already exists.</>}
      
    />
  );
}
