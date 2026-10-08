"use client";

import type { QuestMeta } from "@/lib/dynamodb/quests";
import type { QuestContent } from "@/lib/dynamodb/quest-content";
import { LessonPage } from "@/components/dynamodb/lesson-page";
import { PutItemCodeEditor } from "@/components/dynamodb/put-item-code-editor";

const problemCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function addMewToParty() {
  const command = new PutCommand({
    TableName: "Pokemon",
    Item: {
      Name: "Mew",
      Type: "Psychic",
      Level: 5,
      Status: "Caught"
    },
    // ⬇️ Add your ConditionExpression below to ensure we don't overwrite an existing Mew!
    
  });

  try {
    await docClient.send(command);
    console.log("Mew added safely!");
  } catch (err) {
    console.error("Failed to add Mew:", err instanceof Error ? err.message : String(err));
  }
}`;

const solutionCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function addMewToParty() {
  const command = new PutCommand({
    TableName: "Pokemon",
    Item: {
      Name: "Mew",
      Type: "Psychic",
      Level: 5,
      Status: "Caught"
    },
    ExpressionAttributeNames: { "#name": "Name" },
    ConditionExpression: "attribute_not_exists(#name)"
  });

  try {
    await docClient.send(command);
    console.log("Mew added safely!");
  } catch (err) {
    console.error("Failed to add Mew:", err instanceof Error ? err.message : String(err));
  }
}`;

const brief = (
  <>
      Add a <code>ConditionExpression</code> so Mew is only added if it isn&apos;t already in your party. Use{" "}
      <code>attribute_not_exists(#name)</code>, with <code>#name</code> mapped to <code>Name</code> in{" "}
      <code>ExpressionAttributeNames</code>, so an existing item is never overwritten.
    </>
);

export function Quest5Page({ meta, content }: { meta: QuestMeta; content: QuestContent }) {
  return (
    <LessonPage
      meta={meta}
      content={content}
      challenge={{
        brief,
        render: (onSuccess) => <PutItemCodeEditor problemCode={problemCode} solutionCode={solutionCode} onSuccess={onSuccess} />,
      }}
    />
  );
}

export default Quest5Page;
