"use client";

import type { QuestMeta } from "@/lib/dynamodb/quests";
import type { QuestContent } from "@/lib/dynamodb/quest-content";
import { LessonPage } from "@/components/dynamodb/lesson-page";
import { CodeEditor } from "@/components/dynamodb/code-editor";

const problemCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// This authentic SDK-shaped code is parsed by ServerlessCreed's local emulator.
// It is never executed against AWS and never receives credentials.
const client = new DynamoDBClient({
  region: "ap-south-1",
});
const docClient = DynamoDBDocumentClient.from(client);

async function scanTable() {
  // TODO: Your task is to modify the TableName below
  // The current code scans a "Users" table, but you need to scan the "Pokemon" table instead
  // Replace "Users" with "Pokemon" to complete the challenge
  const command = new ScanCommand({
    TableName: "Users", // ⬅️ Change this value to "Pokemon"
  });

  // The emulator validates the request shape and returns deterministic fixtures.
  // No changes needed in the try-catch block
  try {
    const response = await docClient.send(command);
    console.log("Scan succeeded:", response.Items);
  } catch (err) {
    console.error("Scan failed:", err);
  }
}`;

const solutionCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "ap-south-1",
});
const docClient = DynamoDBDocumentClient.from(client);

async function scanTable() {
  const command = new ScanCommand({
    TableName: "Pokemon",
  });

  try {
    const response = await docClient.send(command);
    console.log("Scan succeeded:", response.Items);
  } catch (err) {
    console.error("Scan failed:", err);
  }
}`;

const brief = (
  <>
      The example scans a <strong>Users</strong> table. Change <code>TableName</code> to{" "}
      <strong>&quot;Pokemon&quot;</strong> so it scans our Pokémon table, then press <strong>Run code</strong>. Stuck? The{" "}
      <strong>Reference solution</strong> tab has the answer.
    </>
);

export function Quest3Page({ meta, content }: { meta: QuestMeta; content: QuestContent }) {
  return (
    <LessonPage
      meta={meta}
      content={content}
      challenge={{
        brief,
        render: (onSuccess) => <CodeEditor problemCode={problemCode} solutionCode={solutionCode} onSuccess={onSuccess} />,
      }}
    />
  );
}

export default Quest3Page;
