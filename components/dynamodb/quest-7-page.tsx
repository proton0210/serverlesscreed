"use client";

import type { QuestMeta } from "@/lib/dynamodb/quests";
import type { QuestContent } from "@/lib/dynamodb/quest-content";
import { LessonPage } from "@/components/dynamodb/lesson-page";
import { AtomicCounterCodeEditor } from "@/components/dynamodb/atomic-counter-code-editor";

const problemCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function recordBattleWin() {
  const command = new UpdateCommand({
    TableName: "Pokemon",
    Key: {
      Name: "Mew"
    },
    // ⬇️ Use the ADD action to increment BattlesWon by 1
    UpdateExpression: "", 
    ExpressionAttributeValues: {
      
    }
  });

  try {
    const response = await docClient.send(command);
    console.log("Battle recorded!");
  } catch (err) {
    console.error("Failed to update stats:", err instanceof Error ? err.message : String(err));
  }
}`;

const solutionCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function recordBattleWin() {
  const command = new UpdateCommand({
    TableName: "Pokemon",
    Key: {
      Name: "Mew"
    },
    UpdateExpression: "ADD BattlesWon :inc",
    ExpressionAttributeValues: {
      ":inc": 1
    }
  });

  try {
    const response = await docClient.send(command);
    console.log("Battle recorded!");
  } catch (err) {
    console.error("Failed to update stats:", err instanceof Error ? err.message : String(err));
  }
}`;

const brief = (
  <>
      Mew won another battle. Use <code>UpdateCommand</code> with the <code>ADD</code> action to increase{" "}
      <code>BattlesWon</code> by 1. It&apos;s atomic, so it beats reading the value and writing it back.
    </>
);

export function Quest7Page({ meta, content }: { meta: QuestMeta; content: QuestContent }) {
  return (
    <LessonPage
      meta={meta}
      content={content}
      challenge={{
        brief,
        render: (onSuccess) => <AtomicCounterCodeEditor problemCode={problemCode} solutionCode={solutionCode} onSuccess={onSuccess} />,
      }}
    />
  );
}

export default Quest7Page;
