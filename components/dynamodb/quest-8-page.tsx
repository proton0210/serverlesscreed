"use client";

import type { QuestMeta } from "@/lib/dynamodb/quests";
import type { QuestContent } from "@/lib/dynamodb/quest-content";
import { LessonPage } from "@/components/dynamodb/lesson-page";
import { DeleteItemCodeEditor } from "@/components/dynamodb/delete-item-code-editor";

const problemCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function releaseMew() {
  // ⬇️ Delete only if Mew exists and is still owned by Ash.
  const command = new DeleteCommand({
    TableName: "Pokemon",
    Key: {
      Name: "Mew"
    },
    // Add ConditionExpression, ExpressionAttributeNames and Values here
    
  });

  try {
    await docClient.send(command);
    console.log("Mew released safely.");
  } catch (err) {
    console.error("Failed to release Mew:", err instanceof Error ? err.message : String(err));
  }
}`;

const solutionCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function releaseMew() {
  const command = new DeleteCommand({
    TableName: "Pokemon",
    Key: {
      Name: "Mew"
    },
    ConditionExpression: "attribute_exists(#name) AND #own = :trainer",
    ExpressionAttributeNames: { "#name": "Name", "#own": "Owner" },
    ExpressionAttributeValues: { ":trainer": "Ash" }
  });

  try {
    await docClient.send(command);
    console.log("Mew released safely.");
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      console.log("Mew is already gone or doesn't belong to Ash!");
    } else {
      console.error("Failed to release Mew:", err instanceof Error ? err.message : String(err));
    }
  }
}`;

const brief = (
  <>
      Time to say goodbye to Mew. Use <code>DeleteCommand</code> with a <code>ConditionExpression</code> that only deletes
      Mew if it exists <em>and</em> still belongs to Ash:{" "}
      <code>attribute_exists(#name) AND #own = :trainer</code>, with <code>#name</code> → <code>Name</code>,{" "}
      <code>#own</code> → <code>Owner</code> (also reserved) and <code>:trainer</code> bound to <code>&quot;Ash&quot;</code>.
    </>
);

export function Quest8Page({ meta, content }: { meta: QuestMeta; content: QuestContent }) {
  return (
    <LessonPage
      meta={meta}
      content={content}
      challenge={{
        brief,
        render: (onSuccess) => <DeleteItemCodeEditor problemCode={problemCode} solutionCode={solutionCode} onSuccess={onSuccess} />,
      }}
    />
  );
}

export default Quest8Page;
