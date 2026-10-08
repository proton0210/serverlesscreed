"use client";

import type { QuestMeta } from "@/lib/dynamodb/quests";
import type { QuestContent } from "@/lib/dynamodb/quest-content";
import { LessonPage } from "@/components/dynamodb/lesson-page";
import { GetItemCodeEditor } from "@/components/dynamodb/get-item-code-editor";

const problemCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "ap-south-1",
});
const docClient = DynamoDBDocumentClient.from(client);

// ServerlessCreed parses this SDK-shaped request and emulates the response locally.
async function getStarterPokemon() {
  const command = new GetCommand({
    TableName: "Pokemon",
    Key: {
      Name: "Pikachu", // ⬅️ Change this to one of the starter Pokemon: "Bulbasaur", "Charmander", or "Squirtle"
    },
  });

  try {
    const response = await docClient.send(command);
    
    if (response.Item) {
      console.log("Starter Pokémon found:", response.Item);
      return response.Item;
    } else {
      console.log("Pokémon not found");
      return null;
    }
  } catch (err) {
    console.error("GetItem failed:", err);
    throw err;
  }
}

getStarterPokemon();`;

const solutionCode = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "ap-south-1",
});
const docClient = DynamoDBDocumentClient.from(client);

async function getStarterPokemon() {
  const command = new GetCommand({
    TableName: "Pokemon",
    Key: {
      Name: "Bulbasaur",
    },
  });

  try {
    const response = await docClient.send(command);
    
    if (response.Item) {
      console.log("Starter Pokémon found:", response.Item);
      return response.Item;
    } else {
      console.log("Pokémon not found");
      return null;
    }
  } catch (err) {
    console.error("GetItem failed:", err);
    throw err;
  }
}

getStarterPokemon();`;

const brief = (
  <>
      The example fetches <strong>Pikachu</strong>. Change the <code>Name</code> in the <code>Key</code> object to one of the
      starters — <strong>&quot;Bulbasaur&quot;</strong>, <strong>&quot;Charmander&quot;</strong> or{" "}
      <strong>&quot;Squirtle&quot;</strong> — then press <strong>Run code</strong>. Stuck? The <strong>Reference solution</strong> tab
      has the answer.
    </>
);

export function Quest4Page({ meta, content }: { meta: QuestMeta; content: QuestContent }) {
  return (
    <LessonPage
      meta={meta}
      content={content}
      challenge={{
        brief,
        render: (onSuccess) => <GetItemCodeEditor problemCode={problemCode} solutionCode={solutionCode} onSuccess={onSuccess} />,
      }}
    />
  );
}

export default Quest4Page;
