import { withKeys } from "@/lib/learn/with-keys";
import type { ReactNode } from "react";

export type JohtoExercise = {
  /** Prose shown above the editor describing the interactive challenge. */
  challengeDescription: ReactNode;
  /** Short "Goal:" hint rendered inside the editor banner. */
  goalHint: ReactNode;
  /** Starter code with the concept-specific piece left for the learner. */
  problemCode: string;
  /** Reference solution shown on the Solution tab. */
  solutionCode: string;
};

// ---------------------------------------------------------------------------
// Quest 9 — Global Secondary Indexes
// ---------------------------------------------------------------------------
const quest9Problem = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function findWaterTypes() {
  const command = new QueryCommand({
    TableName: "JohtoPokemon",
    // ⬇️ Point this Query at the Type1-Index GSI so we can match by Type1.
    //    Add: IndexName, KeyConditionExpression and ExpressionAttributeValues.

  });

  const response = await docClient.send(command);
  console.log("Water-type Pokémon:", response.Items);
}`;

const quest9Solution = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function findWaterTypes() {
  const command = new QueryCommand({
    TableName: "JohtoPokemon",
    IndexName: "Type1-Index",
    KeyConditionExpression: "Type1 = :type",
    ExpressionAttributeValues: {
      ":type": "water",
    },
  });

  const response = await docClient.send(command);
  console.log("Water-type Pokémon:", response.Items);
}`;

// ---------------------------------------------------------------------------
// Quest 10 — Sort Keys (descending Query)
// ---------------------------------------------------------------------------
const quest10Problem = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function strongestFireTypes() {
  const command = new QueryCommand({
    TableName: "JohtoPokemon",
    IndexName: "Type1-Attack-Index",
    KeyConditionExpression: "Type1 = :type",
    ExpressionAttributeValues: {
      ":type": "fire",
    },
    // ⬇️ The strongest Pokémon should come first. Add the option that sorts
    //    the sort key (Attack) in DESCENDING order.

  });

  const response = await docClient.send(command);
  console.log("Fire-types, strongest first:", response.Items);
}`;

const quest10Solution = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function strongestFireTypes() {
  const command = new QueryCommand({
    TableName: "JohtoPokemon",
    IndexName: "Type1-Attack-Index",
    KeyConditionExpression: "Type1 = :type",
    ExpressionAttributeValues: {
      ":type": "fire",
    },
    ScanIndexForward: false,
  });

  const response = await docClient.send(command);
  console.log("Fire-types, strongest first:", response.Items);
}`;

// ---------------------------------------------------------------------------
// Quest 11 — Conditional Writes
// ---------------------------------------------------------------------------
const quest11Problem = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function catchLugia() {
  const command = new UpdateCommand({
    TableName: "LegendaryPokemon",
    Key: { Name: "Lugia" },
    UpdateExpression: "SET #own = :trainer",
    ExpressionAttributeNames: { "#own": "Owner" },
    ExpressionAttributeValues: { ":trainer": "Ash" },
    // ⬇️ Require the Lugia item to exist AND have no owner. UpdateItem can
    //    otherwise create a new item when the key does not exist.

  });

  await docClient.send(command);
  console.log("Lugia caught!");
}`;

const quest11Solution = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function catchLugia() {
  const command = new UpdateCommand({
    TableName: "LegendaryPokemon",
    Key: { Name: "Lugia" },
    UpdateExpression: "SET #own = :trainer",
    ExpressionAttributeNames: { "#name": "Name", "#own": "Owner" },
    ExpressionAttributeValues: { ":trainer": "Ash" },
    ConditionExpression: "attribute_exists(#name) AND attribute_not_exists(#own)",
  });

  await docClient.send(command);
  console.log("Lugia caught!");
}`;

// ---------------------------------------------------------------------------
// Quest 12 — Transactions
// ---------------------------------------------------------------------------
const quest12Problem = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function tradeScytherForOnix() {
  const command = new TransactWriteCommand({
    TransactItems: [
      {
        Update: {
          TableName: "TrainerPokemon",
          Key: { Name: "Scyther" },
          UpdateExpression: "SET #own = :rival",
          ExpressionAttributeNames: { "#own": "Owner" },
          ExpressionAttributeValues: { ":rival": "Gary", ":expected": "Ash" },
          ConditionExpression: "#own = :expected",
        },
      },
      // ⬇️ Add the second half and protect BOTH writes with the owner each
      //    Pokémon is expected to have before the trade.

    ],
  });

  await docClient.send(command);
  console.log("Trade complete!");
}`;

const quest12Solution = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function tradeScytherForOnix() {
  const command = new TransactWriteCommand({
    TransactItems: [
      {
        Update: {
          TableName: "TrainerPokemon",
          Key: { Name: "Scyther" },
          UpdateExpression: "SET #own = :rival",
          ExpressionAttributeNames: { "#own": "Owner" },
          ExpressionAttributeValues: { ":rival": "Gary", ":expected": "Ash" },
          ConditionExpression: "#own = :expected",
        },
      },
      {
        Update: {
          TableName: "TrainerPokemon",
          Key: { Name: "Onix" },
          UpdateExpression: "SET #own = :you",
          ExpressionAttributeNames: { "#own": "Owner" },
          ExpressionAttributeValues: { ":you": "Ash", ":expected": "Gary" },
          ConditionExpression: "#own = :expected",
        },
      },
    ],
  });

  await docClient.send(command);
  console.log("Trade complete!");
}`;

// ---------------------------------------------------------------------------
// Quest 13 — Batch Operations
// ---------------------------------------------------------------------------
const quest13Problem = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function healParty() {
  /** @type {import("@aws-sdk/lib-dynamodb").BatchGetCommandInput["RequestItems"]} */
  let requestItems = {
      JohtoPokemon: {
        Keys: [
          { Name: "Chikorita" },
          // ⬇️ Add the other two starters so all three heal in one request.

        ],
      },
  };

  // BatchGet can return partial results. Keep retrying UnprocessedKeys.
  const party = [];
  let attempts = 0;
  do {
    const response = await docClient.send(new BatchGetCommand({ RequestItems: requestItems }));
    party.push(...(response.Responses?.JohtoPokemon ?? []));
    requestItems = response.UnprocessedKeys ?? {};
    if (Object.keys(requestItems).length > 0) {
      if (++attempts >= 6) throw new Error("Retry budget exhausted; preserve remaining keys for later.");
      const delay = Math.random() * Math.min(2000, 100 * 2 ** attempts);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  } while (Object.keys(requestItems).length > 0);

  console.log("Loaded party (response order is not guaranteed):", party);
}`;

const quest13Solution = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function healParty() {
  /** @type {import("@aws-sdk/lib-dynamodb").BatchGetCommandInput["RequestItems"]} */
  let requestItems = {
      JohtoPokemon: {
        Keys: [
          { Name: "Chikorita" },
          { Name: "Cyndaquil" },
          { Name: "Totodile" },
        ],
      },
  };

  const party = [];
  let attempts = 0;
  do {
    const response = await docClient.send(new BatchGetCommand({ RequestItems: requestItems }));
    party.push(...(response.Responses?.JohtoPokemon ?? []));
    requestItems = response.UnprocessedKeys ?? {};
    if (Object.keys(requestItems).length > 0) {
      if (++attempts >= 6) throw new Error("Retry budget exhausted; preserve remaining keys for later.");
      const delay = Math.random() * Math.min(2000, 100 * 2 ** attempts);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

  } while (Object.keys(requestItems).length > 0);

  console.log("Loaded party (response order is not guaranteed):", party);
}`;

// ---------------------------------------------------------------------------
// Quest 14 — Pagination
// ---------------------------------------------------------------------------
const quest14Problem = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Page 1 returned LastEvaluatedKey: { Name: "Meganium" }
async function loadNextPage() {
  const command = new ScanCommand({
    TableName: "JohtoPokemon",
    Limit: 3,
    // ⬇️ Resume from where page 1 stopped to fetch the next 10 Pokémon.

  });

  const response = await docClient.send(command);
  console.log("Next page:", response.Items);
  console.log("Stopped at:", response.LastEvaluatedKey);
}`;

const quest14Solution = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Page 1 returned LastEvaluatedKey: { Name: "Meganium" }
async function loadNextPage() {
  const command = new ScanCommand({
    TableName: "JohtoPokemon",
    Limit: 3,
    ExclusiveStartKey: { Name: "Meganium" },
  });

  const response = await docClient.send(command);
  console.log("Next page:", response.Items);
  console.log("Stopped at:", response.LastEvaluatedKey);
}`;

// ---------------------------------------------------------------------------
// Quest 15 — Time To Live
// ---------------------------------------------------------------------------
const quest15Problem = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function applyBurn() {
  const command = new PutCommand({
    TableName: "StatusEffects",
    Item: {
      PokemonId: "Pikachu",
      Effect: "Burn",
      // ⬇️ Add a TTL attribute that expires 5 minutes (300s) from now, in
      //    epoch SECONDS. Hint: Math.floor(Date.now() / 1000) + 300

    },
  });

  await docClient.send(command);
  console.log("Burn applied — now eligible for asynchronous TTL cleanup.");
}`;

const quest15Solution = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function applyBurn() {
  const command = new PutCommand({
    TableName: "StatusEffects",
    Item: {
      PokemonId: "Pikachu",
      Effect: "Burn",
      ExpirationTime: Math.floor(Date.now() / 1000) + 300,
    },
  });

  await docClient.send(command);
  console.log("Burn applied — now eligible for asynchronous TTL cleanup.");
}`;

// ---------------------------------------------------------------------------
// Quest (bridge) — Expression Attributes (names + values)
// ---------------------------------------------------------------------------
const questExpressionsProblem = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function crownMew() {
  const command = new UpdateCommand({
    TableName: "Pokemon",
    Key: { Name: "Mew" },
    // "Status" is a DynamoDB reserved word, so it can't sit in the expression directly.
    // ⬇️ Set Status to "Champion" using a #name alias and a :value placeholder.
    //    Add: UpdateExpression, ExpressionAttributeNames and ExpressionAttributeValues.

  });

  await docClient.send(command);
  console.log("Mew is the Champion!");
}`;

const questExpressionsSolution = `// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function crownMew() {
  const command = new UpdateCommand({
    TableName: "Pokemon",
    Key: { Name: "Mew" },
    UpdateExpression: "SET #status = :status",
    ExpressionAttributeNames: {
      "#status": "Status",
    },
    ExpressionAttributeValues: {
      ":status": "Champion",
    },
  });

  await docClient.send(command);
  console.log("Mew is the Champion!");
}`;

const quest16Problem = `// @ts-nocheck
// Complete the architecture review. This is a design simulator: each choice
// represents infrastructure you would configure with IaC in production.
const productionPlan = {
  billingMode: "",
  consistency: "",
  partitionShardCount: 0,
  streamViewType: "",
  pointInTimeRecovery: false,
  encryption: "",
  largeItemStore: "",
  multiRegion: "",
  globalTableConsistency: "",
  alarms: [],
};`;

const quest16Solution = `// @ts-nocheck
const productionPlan = {
  billingMode: "PAY_PER_REQUEST",
  consistency: "EVENTUAL_BY_DEFAULT",
  partitionShardCount: 8,
  streamViewType: "NEW_AND_OLD_IMAGES",
  pointInTimeRecovery: true,
  encryption: "KMS",
  largeItemStore: "S3",
  multiRegion: "GLOBAL_TABLE",
  globalTableConsistency: "MREC",
  alarms: ["THROTTLED_REQUESTS", "SYSTEM_ERRORS", "LATENCY"],
};`;

const rawJohtoExercises: Record<string, JohtoExercise> = {
  "quest-expressions": {
    challengeDescription: (
      <>
        Time to crown Mew the Champion. Mew&apos;s record has a{" "}
        <code>Status</code> attribute — but <code>Status</code> is a DynamoDB{" "}
        <strong>reserved word</strong>, so it can&apos;t go straight into the
        expression. Alias it with a <code>#</code> name placeholder and bind the
        new value with a <code>:</code> value placeholder.
      </>
    ),
    goalHint: (
      <>
        Use <code>UpdateExpression: &quot;SET #status = :status&quot;</code>, map{" "}
        <code>&quot;#status&quot;</code> to <code>&quot;Status&quot;</code> in{" "}
        <code>ExpressionAttributeNames</code>, and bind <code>:status</code> to{" "}
        <code>&quot;Champion&quot;</code> in <code>ExpressionAttributeValues</code>.
      </>
    ),
    problemCode: questExpressionsProblem,
    solutionCode: questExpressionsSolution,
  },
  "quest-9": {
    challengeDescription: (
      <>
        The Pokédex is keyed by <code>Name</code>, but we want every{" "}
        <strong>Water</strong> type without a slow full-table <code>Scan</code>.
        Point the <code>Query</code> at the <code>Type1-Index</code> GSI and
        match <code>Type1 = :type</code> where <code>:type</code> is{" "}
        <code>&quot;water&quot;</code>.
      </>
    ),
    goalHint: (
      <>
        Add <code>IndexName</code>, <code>KeyConditionExpression</code> and{" "}
        <code>ExpressionAttributeValues</code> to query the GSI for{" "}
        <code>&quot;water&quot;</code>.
      </>
    ),
    problemCode: quest9Problem,
    solutionCode: quest9Solution,
  },
  "quest-10": {
    challengeDescription: (
      <>
        You want the strongest Fire types first. The GSI{" "}
        <code>Type1-Attack-Index</code> already sorts by <code>Attack</code> —
        flip the scan direction so the highest Attack comes back at the top.
      </>
    ),
    goalHint: (
      <>
        Add <code>ScanIndexForward: false</code> to return results in descending{" "}
        <code>Attack</code> order.
      </>
    ),
    problemCode: quest10Problem,
    solutionCode: quest10Solution,
  },
  "quest-11": {
    challengeDescription: (
      <>
        Two trainers might throw a Master Ball at the same instant. Make the
        catch safe by only writing the <code>Owner</code> if Lugia has no owner
        yet.
      </>
    ),
    goalHint: (
      <>
        Require <code>attribute_exists(#name)</code>, with <code>#name</code> mapped to <code>Name</code> and{" "}
        <code>attribute_not_exists(#own)</code>. This prevents both duplicate
        ownership and a phantom item if Lugia&apos;s key does not exist.
      </>
    ),
    problemCode: quest11Problem,
    solutionCode: quest11Solution,
  },
  "quest-12": {
    challengeDescription: (
      <>
        Trading Scyther for Onix is two writes that must both succeed or both
        fail. Complete the <code>TransactWriteCommand</code> by adding the second{" "}
        <code>Update</code> that hands Onix to you.
      </>
    ),
    goalHint: (
      <>
        Add the second <code>Update</code>, and give both updates a condition
        that checks the expected current owner before swapping them.
      </>
    ),
    problemCode: quest12Problem,
    solutionCode: quest12Solution,
  },
  "quest-13": {
    challengeDescription: (
      <>
        Load the party efficiently. Finish the <code>Keys</code> array and keep
        retrying <code>UnprocessedKeys</code>, because batch responses can be
        partial and their item order is not guaranteed.
      </>
    ),
    goalHint: (
      <>
        Add <code>Cyndaquil</code> and <code>Totodile</code>. The starter loop
        already re-sends <code>response.UnprocessedKeys</code> with capped
        exponential backoff and jitter, so keep it.
      </>
    ),
    problemCode: quest13Problem,
    solutionCode: quest13Solution,
  },
  "quest-14": {
    challengeDescription: (
      <>
        Page 1 stopped at <code>{`{ Name: "Meganium" }`}</code>. Pass that key
        back as the <code>ExclusiveStartKey</code> so the next request resumes
        exactly where the last one ended.
      </>
    ),
    goalHint: (
      <>
        Add <code>{`ExclusiveStartKey: { Name: "Meganium" }`}</code> to fetch the
        next page.
      </>
    ),
    problemCode: quest14Problem,
    solutionCode: quest14Solution,
  },
  "quest-15": {
    challengeDescription: (
      <>
        A Burn should clear itself after 5 minutes. Add an{" "}
        <code>ExpirationTime</code> TTL attribute (epoch <em>seconds</em>) so
        DynamoDB can remove it asynchronously. Treat expired items as invalid
        in application reads until background deletion finishes.
      </>
    ),
    goalHint: (
      <>
        Add <code>ExpirationTime: Math.floor(Date.now() / 1000) + 300</code> to
        the item.
      </>
    ),
    problemCode: quest15Problem,
    solutionCode: quest15Solution,
  },
  "quest-16": {
    challengeDescription: (
      <>
        The Elite Four will not approve a design that only works on a laptop.
        Complete the production review with explicit choices for unpredictable
        traffic, normal read consistency, write distribution, change capture,
        recovery, encryption, large payloads, multi-Region replication, and alarms.
      </>
    ),
    goalHint: (
      <>
        Choose on-demand capacity, eventual reads by default, at least four
        write shards, NEW_AND_OLD_IMAGES Streams, PITR, KMS encryption, S3 for
        large objects, Global Tables in MREC mode, and throttling/error/latency alarms.
      </>
    ),
    problemCode: quest16Problem,
    solutionCode: quest16Solution,
  },
};

export const johtoExercises = withKeys(rawJohtoExercises);
