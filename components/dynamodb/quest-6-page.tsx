"use client";

import type { QuestMeta } from "@/lib/dynamodb/quests";
import type { QuestContent } from "@/lib/dynamodb/quest-content";
import { LessonPage } from "@/components/dynamodb/lesson-page";
import { UpdateItemCodeEditor } from "@/components/dynamodb/update-item-code-editor";

const problemCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function levelUpMew() {
  const command = new UpdateCommand({
    TableName: "Pokemon",
    Key: {
      Name: "Mew"
    },
    // ⬇️ Complete the UpdateExpression and ExpressionAttributeValues below
    UpdateExpression: "", 
    ExpressionAttributeValues: {
      
    }
  });

  try {
    const response = await docClient.send(command);
    console.log("Mew leveled up successfully!");
  } catch (err) {
    console.error("Failed to update Mew:", err instanceof Error ? err.message : String(err));
  }
}`;

const solutionCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function levelUpMew() {
  const command = new UpdateCommand({
    TableName: "Pokemon",
    Key: {
      Name: "Mew"
    },
    ExpressionAttributeNames: { "#level": "Level" },
    UpdateExpression: "SET #level = :newLevel",
    ExpressionAttributeValues: {
      ":newLevel": 6
    }
  });

  try {
    const response = await docClient.send(command);
    console.log("Mew leveled up successfully!");
  } catch (err) {
    console.error("Failed to update Mew:", err instanceof Error ? err.message : String(err));
  }
}`;

const brief = (
  <>
      Mew has gained experience and is ready for <strong>Level 6</strong>. Use <code>UpdateCommand</code> to change its{" "}
      <code>Level</code> without rewriting the rest of the item: fill in <code>UpdateExpression</code> and{" "}
      <code>ExpressionAttributeValues</code>, and add{" "}
      <code>{`ExpressionAttributeNames: { "#level": "Level" }`}</code> because <code>Level</code> is a reserved word.
    </>
);

export function Quest6Page({ meta, content }: { meta: QuestMeta; content: QuestContent }) {
  return (
    <LessonPage
      meta={meta}
      content={content}
      challenge={{
        brief,
        render: (onSuccess) => <UpdateItemCodeEditor problemCode={problemCode} solutionCode={solutionCode} onSuccess={onSuccess} />,
      }}
    />
  );
}

export default Quest6Page;
