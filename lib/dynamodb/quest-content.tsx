import { withKeys } from "@/lib/learn/with-keys";
import { nodeText } from "@/components/learn/lesson/node-text";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiSettings, FiBookOpen, FiSearch, FiCheckCircle, FiFilePlus, FiDatabase, FiLayers, FiAlertTriangle, FiEdit, FiTrendingUp, FiTrash2, FiShield } from "react-icons/fi";
import { FaPuzzlePiece } from "react-icons/fa";
import { GiBrickWall } from "react-icons/gi";
import { HiOutlineLightBulb } from "react-icons/hi2";
import { TbCircleNumber1Filled, TbCircleNumber2Filled } from "react-icons/tb";
import { PartitionLab } from "@/components/dynamodb/scene/partition-lab";
import { LessonScene } from "@/components/dynamodb/scene/lesson-scene";

import type { QuestContent } from "@/lib/learn/types";

export type { QuestContent, QuestSection } from "@/lib/learn/types";

const headingWithIcon = (Icon: IconType, label: string) => (
  <span className="inline-flex items-center gap-2">
    <Icon aria-hidden className="h-5 w-5" />
    <span>{label}</span>
  </span>
);

const inlineLabel = (Icon: IconType, label: string) => (
  <span className="inline-flex items-center gap-2 font-semibold">
    <Icon aria-hidden className="h-4 w-4" />
    <span>{label}</span>
  </span>
);

const rawQuestContent: Record<string, QuestContent> = {
  "quest-1": {
    intro: (
      <>
        In DynamoDB, every item (row) must have a <strong>primary key</strong>{" "}
        &mdash; it uniquely identifies that item in a table. The{" "}
        <strong>Partition Key</strong> (also called <strong>Hash Key</strong>)
        decides <em>where</em> the item is stored inside DynamoDB&apos;s
        internal partitions.
      </>
    ),
    keyTakeaways: [
      <>Primary keys uniquely identify each item in a table.</>,
      <>Partition keys determine the physical placement of data.</>,
      <>Items sharing a partition key form an item collection; this logical group can span physical partitions.</>,
    ],
    sections: [
      {
        title: headingWithIcon(GiBrickWall, "What Is a Partition Key?"),
        paragraphs: [
          <>
            In DynamoDB, every item (row) must have a{" "}
            <strong>primary key</strong> &mdash; it uniquely identifies that
            item in a table.
          </>,
          <>
            The <strong>Partition Key</strong> (also called{" "}
            <strong>Hash Key</strong>) decides <em>where</em> the item is stored
            inside DynamoDB&apos;s internal partitions.
          </>,
        ],
        callout: (
          <>
            Think of Bill&apos;s PC: the hash of each Pokémon&apos;s <em>Name</em> decides which storage Box it lands in, and every Box holds many Pokémon.
          </>
        ),
      },
      {
        title: headingWithIcon(FiSettings, "How DynamoDB Uses It"),
        paragraphs: [<>When you insert or fetch data:</>],
        bullets: [
          <>
            DynamoDB uses the <strong>Partition Key value</strong> to compute a{" "}
            <em>hash</em>.
          </>,
          <>That hash decides which internal partition the item lives in.</>,
          <>Items with the same partition key form an item collection. On a table without a local secondary index (LSI, covered later), DynamoDB can split that collection across physical partitions as it scales.</>,
        ],
        visual: <PartitionLab />,
      },
      {
        title: headingWithIcon(FaPuzzlePiece, "Types of Primary Keys"),
        paragraphs: [<>DynamoDB supports two primary key patterns.</>],
      },
      {
        title: headingWithIcon(
          TbCircleNumber1Filled,
          "Simple Primary Key (only Partition Key)",
        ),
        paragraphs: [
          <>
            Uses <strong>one attribute</strong> to uniquely identify an item.
          </>,
          <>Example:</>,
        ],
        bullets: [
          <>
            <strong>Partition Key:</strong> <code>Name</code>
          </>,
          <>Every Pokémon&apos;s name is unique &rarr; each item = one Pokémon.</>,
        ],
        table: {
          caption: (
            <>
              Each Pokémon is uniquely identified by its <code>Name</code>{" "}
              attribute.
            </>
          ),
          headers: ["Name", "Type1", "Type2", "Height(m)", "Weight(kg)"],
          rows: [
            ["Bulbasaur", "grass", "poison", "0.7", "6.9"],
            ["Charmander", "fire", "---", "0.6", "8.5"],
            ["Squirtle", "water", "---", "0.5", "9.0"],
          ],
        },
        postTableParagraphs: [
          <>
            {inlineLabel(FiBookOpen, "Use Case:")} Perfect when each Pokémon is
            unique and can be fetched directly by name:
          </>,
        ],
        codeSnippets: [
          {
            label: "GetItem input (document client)",
            language: "js",
            code: `{
  TableName: "Pokemon",
  Key: { Name: "Bulbasaur" }
}`,
          },
        ],
      },
      {
        title: headingWithIcon(
          TbCircleNumber2Filled,
          "Composite Primary Key (Partition + Sort Key)",
        ),
        paragraphs: [
          <>
            Uses <strong>two attributes</strong> together for uniqueness.
          </>,
          <>
            The following is a small teaching example. <code>Type1</code> has
            very few possible values, so a large production workload could
            concentrate traffic on hot keys. Start from real access patterns
            and choose a high-cardinality, evenly used partition key—or add a
            deliberate shard when one logical group receives heavy traffic.
          </>,
          <>Toy example:</>,
        ],
        bullets: [
          <>
            <strong>Partition Key:</strong> <code>Type1</code>
          </>,
          <>
            <strong>Sort Key:</strong> <code>Name</code>
          </>,
          <>This way, Pokémon of the same type are grouped together.</>,
        ],
        table: {
          caption: (
            <>
              Useful for seeing composite-key mechanics, not a blanket
              production recommendation for a high-traffic Pokédex.
            </>
          ),
          headers: ["Type1", "Name", "Height(m)", "Weight(kg)"],
          rows: [
            ["grass", "Bulbasaur", "0.7", "6.9"],
            ["grass", "Ivysaur", "1.0", "13.0"],
            ["fire", "Charmander", "0.6", "8.5"],
            ["fire", "Charizard", "1.7", "90.5"],
          ],
        },
        postTableParagraphs: [
          <>
            {inlineLabel(FiBookOpen, "Use Case:")} Quickly find all Pokémon of a
            specific type, sorted alphabetically:
          </>,
        ],
        codeSnippets: [
          {
            label: "Query example",
            language: "js",
            code: `{
  TableName: "PokemonByType",
  KeyConditionExpression: "Type1 = :type",
  ExpressionAttributeValues: { ":type": "fire" }
}`,
          },
        ],
      },
    ],
    quiz: {
      prompt: (
        <>
          If you define a table with <strong>only one attribute</strong> (
          <code>Name</code>) as a key, what type of key is that?
        </>
      ),
      options: [
        "A) Composite Primary Key",
        "B) Simple Primary Key",
        "C) Secondary Index",
        "D) Global Key",
      ],
      answer: <>A table keyed by one attribute has a simple primary key: that attribute is the partition key, and every value must be unique.</>
    },
  },
  "quest-2": {
    intro: (
      <>
        We&apos;ll store each Pokémon by its unique <strong>Name</strong> as the
        Partition Key.
      </>
    ),
    keyTakeaways: [
      <>Choose a partition key that is unique and frequently queried.</>,
      <>Only key attributes have a declared type: every item&apos;s <code>Name</code> must be a String. Other attributes are schemaless.</>,
      <>Key values are case-sensitive: &quot;Bulbasaur&quot; and &quot;bulbasaur&quot; are two different items.</>,
    ],
    sections: [
      {
        title: headingWithIcon(HiOutlineLightBulb, "Scenario"),
        paragraphs: [
          <>
            We&apos;ll store each Pokémon by its unique{" "}
            <strong>Name</strong> as the Partition Key.
          </>,
        ],
        callout: (
          <>
            Simple primary keys shine when you rarely query for groups of items
            and just need fast lookups by one unique key, like <code>Name</code>.
          </>
        ),
      },
      {
        title: headingWithIcon(FiDatabase, "Table Definition"),
        paragraphs: [
          <>
            Define a DynamoDB table with <code>Name</code> as the partition key.
          </>,
        ],
        codeSnippets: [
          {
            label: "AWS CDK (TypeScript)",
            language: "ts",
            code: `const table = new dynamodb.Table(this, "PokemonTable", {
  tableName: "Pokemon",
  partitionKey: { name: "Name", type: dynamodb.AttributeType.STRING },
});`,
          },
        ],
      },
      {
        title: headingWithIcon(FiFilePlus, "Insert Item Example"),
        paragraphs: [
          <>With the document client you pass plain JavaScript values in <code>Item</code>. PutItem is a full replace: writing the same <code>Name</code> again overwrites the whole item (Quest 5 shows how to guard against that).</>,
        ],
        codeSnippets: [
          {
            label: "PutCommand input (document client)",
            language: "js",
            code: `{
  TableName: "Pokemon",
  Item: {
    Name: "Bulbasaur",
    Type1: "grass",
    Type2: "poison",
    Height_m: 0.7,
    Weight_kg: 6.9
  }
}`,
          },
        ],
      },
      {
        title: headingWithIcon(FiSearch, "Get Item Example"),
        paragraphs: [
          <>Retrieve the Pokémon by supplying the same partition key value:</>,
        ],
        codeSnippets: [
          {
            label: "GetCommand input (document client)",
            language: "js",
            code: `{
  TableName: "Pokemon",
  Key: { Name: "Bulbasaur" }
}`,
          },
        ],
        visual: <LessonScene questId="quest-2" />,
      },
    ],
    quiz: {
      prompt: (
<>Which attribute is used as the partition key here?</>
      ),
      options: ["A) Type1", "B) Name", "C) Weight_kg", "D) Height_m"],
      answer: <>The table is keyed on <code>Name</code> alone, so <code>Name</code> is the partition key — each Pokémon&apos;s name must be unique.</>
    },
  },
  "quest-3": {
    intro: (
      <>
        Imagine you need to find <strong>all</strong> the Pokémon in your table,
        not just one by name. The <strong>Scan</strong> operation lets you read
        every item in a DynamoDB table, one page at a time.
      </>
    ),
    keyTakeaways: [
      <>Scan reads all items from a table without needing to know specific keys.</>,
      <>Each request reads up to 1 MB; continue while LastEvaluatedKey is present.</>,
      <>FilterExpression is applied after reading and does not reduce consumed read capacity.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiLayers, "What is a Scan Operation?"),
        paragraphs: [
          <>
            Think of your DynamoDB table like a huge toy box full of Pokémon cards.
            A <strong>Scan</strong> is like dumping out the <em>entire toy box</em>{" "}
            and looking through every single card one by one to see what you have.
          </>,
          <>
            You don&apos;t need to know the name of a specific Pokémon beforehand—you
            just want to see <strong>everything</strong> that&apos;s in there! DynamoDB
            will show you all the cards (items), but it might give them to you in small
            groups (pages) if there are too many to look at all at once.
          </>,
        ],
        callout: (
          <>
            Use Scan for bounded admin jobs or table-wide work. Even ConsistentRead does not give a whole-table snapshot. For user-facing access patterns, model a key or index and use Query.
          </>
        ),
      },
      {
        title: headingWithIcon(FiSearch, "How Scan Works"),
        paragraphs: [<>When you perform a Scan operation:</>],
        bullets: [
          <>
            DynamoDB reads <strong>every item</strong> in the table.
          </>,
          <>
            A request reads up to <strong>1 MB</strong> (or its <code>Limit</code>) before filtering. You pay for every item read, not just the ones returned: 4 KB read units, at half price with the default eventually consistent reads.
          </>,
          <>
            You can add <strong>filters</strong> to only show certain Pokémon, but
            DynamoDB still looks at everything first.
          </>,
          <>
            To get the next page, you use the <code>LastEvaluatedKey</code> from
            the previous response.
          </>,
        ],
        visual: <LessonScene questId="quest-3" />,
      },
      {
        title: headingWithIcon(FiDatabase, "Scan Operation Example"),
        paragraphs: [
          <>
            Here&apos;s the AWS SDK v3 request shape. ServerlessCreed parses this code and
            runs it against deterministic fixtures; it never connects to AWS.
          </>,
        ],
        codeSnippets: [
          {
            label: "Scan command with AWS SDK v3",
            language: "typescript",
            code: `// Import the DynamoDBClient class - this is the main client used to interact with DynamoDB
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// Import the document client wrapper and its ScanCommand (plain JS objects in and out)
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// Request-shape example only: ServerlessCreed never executes this client.
const client = new DynamoDBClient({
  // Specify the AWS region where your DynamoDB table is located (ap-south-1 = Asia Pacific Mumbai)
  region: "ap-south-1",
});
const docClient = DynamoDBDocumentClient.from(client);

// Define an async function to perform the scan operation
async function scanTable() {
  // Create a new ScanCommand with the table name you want to scan
  const command = new ScanCommand({
    // Specify the name of the DynamoDB table to scan
    TableName: "Pokemon",
  });

  // Use try-catch to handle potential errors during the scan operation
  try {
    // Send the scan command to DynamoDB and wait for the response
    const response = await docClient.send(command);
    // Log the items returned from the scan operation
    console.log("Scan succeeded:", response.Items);
  } catch (err) {
    // If an error occurs, log the error message
    console.error("Scan failed:", err);
  }
}`,
          },
          {
            label: "Fetch every page (manual loop)",
            language: "typescript",
            code: `async function scanAllPokemon() {
  const allPokemon = [];
  let ExclusiveStartKey; // undefined on the first request

  do {
    const page = await docClient.send(
      new ScanCommand({ TableName: "Pokemon", ExclusiveStartKey })
    );
    allPokemon.push(...(page.Items ?? []));
    ExclusiveStartKey = page.LastEvaluatedKey; // undefined on the last page
  } while (ExclusiveStartKey);

  return allPokemon;
}
// Shortcut: paginateScan from @aws-sdk/lib-dynamodb runs this loop for you.`,
          },
        ],
        postTableParagraphs: [
          <>
            One request returns only one page. To fetch <strong>all items</strong>,
            repeat the scan with <code>ExclusiveStartKey</code> until the response
            has no <code>LastEvaluatedKey</code>.
            The <code>@aws-sdk/lib-dynamodb</code> package automatically converts
            DynamoDB&apos;s native format to JavaScript objects, making your code
            much cleaner!
          </>,
        ],
      },
    ],
    quiz: {
      prompt: (
        <>
          What does the Scan operation do in DynamoDB?
        </>
      ),
      options: [
        "A) Retrieves one specific item by its key",
        "B) Reads all items in the table",
        "C) Deletes items from the table",
        "D) Updates items in the table",
      ],
      answer: <>Scan reads every item in the table (1 MB per page), so its cost grows with the whole table, not with the items you keep.</>
    },
  },
  "quest-4": {
    intro: (
      <>
        Welcome to Professor Oak&apos;s lab! It&apos;s time to choose your first
        partner Pokémon. You have three options: <strong>Bulbasaur</strong>,{" "}
        <strong>Charmander</strong>, or <strong>Squirtle</strong>. Once you&apos;ve
        made your choice, you&apos;ll need to fetch your starter from the Pokédex
        using DynamoDB. Unlike scanning the entire table, you can retrieve a
        specific Pokémon efficiently using its <strong>Name</strong> as the partition key.
      </>
    ),
    keyTakeaways: [
      <>GetItem retrieves a single item by its primary key efficiently.</>,
      <>Using the partition key directly is faster than scanning the entire table.</>,
      <>GetItem needs the full primary key: the partition key, plus the sort key if the table has one.</>,
    ],
    sections: [
      {
        title: headingWithIcon(HiOutlineLightBulb, "The Choice"),
        paragraphs: [
          <>
            Professor Oak presents you with three starter Pokémon. Each has unique
            characteristics that will shape your journey. Take a look at their types and sizes:
          </>,
        ],
        table: {
          caption: (
            <>
              Choose wisely! Each starter has a different type and build that will
              influence your adventure.
            </>
          ),
          headers: ["Name", "Type1", "Type2", "Height(m)", "Weight(kg)"],
          rows: [
            ["Bulbasaur", "grass", "poison", "0.7", "6.9"],
            ["Charmander", "fire", "---", "0.6", "8.5"],
            ["Squirtle", "water", "---", "0.5", "9.0"],
          ],
        },
        callout: (
          <>
            Remember: In Quest 2, we built a table with <code>Name</code> as the
            partition key. This means we can fetch any Pokémon directly by name!
          </>
        ),
      },
      {
        title: headingWithIcon(FiSearch, "Why GetItem Instead of Scan?"),
        paragraphs: [
          <>
            In Quest 3, you learned about <strong>Scan</strong>, which reads every
            item in the table. But when you know exactly which Pokémon you want,
            there&apos;s a much more efficient way!
          </>,
        ],
        bullets: [
          <>
            <strong>Scan</strong> reads through <em>every single item</em> in the
            table, even if you only need one Pokémon.
          </>,
          <>
            <strong>GetItem</strong> uses the partition key to go <em>directly</em> to
            the exact item you want, like looking up a word in a dictionary.
          </>,
          <>
            GetItem is <strong>faster</strong> and <strong>cheaper</strong> because
            DynamoDB doesn&apos;t need to examine every item.
          </>,
          <>
            You must know the exact <code>Name</code> value to use GetItem—perfect
            for fetching your chosen starter!
          </>,
          <>
            GetItem is <strong>eventually consistent</strong> by default (half a read unit per 4 KB). Add{" "}
            <code>ConsistentRead: true</code> when you must see the very latest write; it costs a full read unit.
          </>,
        ],
        visual: <LessonScene questId="quest-4" />,
      },
      {
        title: headingWithIcon(FiDatabase, "Fetching Your Starter Pokémon"),
        paragraphs: [
          <>
            Now it&apos;s time to fetch your chosen starter. This is an authentic{" "}
            <strong>GetItem</strong> request shape evaluated only by the ServerlessCreed emulator:
          </>,
        ],
        codeSnippets: [
          {
            label: "GetItem command with AWS SDK v3",
            language: "typescript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "ap-south-1",
});
const docClient = DynamoDBDocumentClient.from(client);

async function getStarterPokemon(pokemonName: string) {
  const command = new GetCommand({
    TableName: "Pokemon",
    Key: {
      Name: pokemonName,
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

getStarterPokemon("Bulbasaur");`,
          },
        ],
        postTableParagraphs: [
          <>
            {inlineLabel(FiBookOpen, "Key Points:")} Notice how we specify the exact{" "}
            <code>Name</code> in the <code>Key</code> object. DynamoDB uses this to
            compute the hash and go directly to the partition containing that Pokémon.
            This is much more efficient than scanning the entire table!
          </>,
        ],
      },
    ],
    quiz: {
      prompt: (
        <>
          When you know the exact <code>Name</code> of a Pokémon you want to fetch,
          which operation should you use?
        </>
      ),
      options: [
        "A) Scan - to read through all items and find the one you need",
        "B) GetItem - to fetch the item directly using its primary key",
        "C) Query - to search for multiple items matching a condition",
        "D) PutItem - to insert a new item into the table",
      ],
      answer: (
        <>
          GetItem is the most
          efficient way to fetch a single item when you know its exact primary key
          value.
        </>
      )
    },
  },
  "quest-5": {
    intro: (
      <>
        You&apos;ve encountered the mythical Pokémon <strong>Mew</strong>! You want to add it
        to your party (the <code>Pokemon</code> table), but you must be careful.
        If you just use <code>PutItem</code>, you might overwrite an existing Pokémon
        if they have the same name (unlikely for Mew, but critical for data integrity!).
        Use a <strong>ConditionExpression</strong> to ensure the item doesn&apos;t already exist.
      </>
    ),
    keyTakeaways: [
      <>PutItem overwrites items with the same primary key by default.</>,
      <>Use ConditionExpression to prevent accidental overwrites.</>,
      <>attribute_not_exists(key) ensures the item is new.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiAlertTriangle, "The Overwrite Problem"),
        paragraphs: [
          <>
            DynamoDB&apos;s <code>PutItem</code> operation is destructive by default.
            If you put an item with the same Partition Key (Name) as an existing item,
            DynamoDB will <strong>replace</strong> the old item completely.
          </>,
          <>
            To prevent this, you can ask DynamoDB to check a condition before writing.
            If the condition fails, the write is rejected with a <code>ConditionalCheckFailedException</code>.
          </>
        ],
        codeSnippets: [
          {
            label: "Unsafe Put (Overwrites)",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new PutCommand({
  TableName: "Pokemon",
  Item: { Name: "Mew", Level: 5 }
}));`
          }
        ],
        visual: <LessonScene questId="quest-5" />,
      },
      {
        title: headingWithIcon(FiCheckCircle, "Safe Put with Conditions"),
        paragraphs: [
          <>
            Use <code>ConditionExpression</code> with the function <code>attribute_not_exists()</code>.
            This tells DynamoDB: &quot;Only write this item if the attribute &apos;Name&apos; does not exist yet.&quot;
          </>
        ],
        callout: (
          <>
            Heads-up: <code>Name</code> is a DynamoDB reserved word, so the condition refers to it as{" "}
            <code>#name</code> and maps it in <code>ExpressionAttributeNames</code>. The{" "}
            <strong>Expression Attributes</strong> quest explains this <code>#</code> placeholder in depth.
          </>
        ),
        codeSnippets: [
          {
            label: "Safe Put",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new PutCommand({
  TableName: "Pokemon",
  Item: { Name: "Mew", Level: 5 },
  ExpressionAttributeNames: { "#name": "Name" },
  ConditionExpression: "attribute_not_exists(#name)"
}));`
          }
        ]
      }
    ],
    quiz: {
      prompt: <>What happens if you use PutItem on an existing key without a condition?</>,
      options: [
        "A) It throws an error saying the item exists",
        "B) It adds a duplicate item",
        "C) It overwrites the existing item",
        "D) It creates a copy with a new ID"
      ],
      answer: <>It overwrites the existing item!</>
    }
  },
  "quest-6": {
    intro: (
      <>
        Mew has battled hard and gained experience! It&apos;s time to level up. 
        A naive approach is to read the whole item, change the value in your code, and Put it all back.
        In DynamoDB, you can use <strong>UpdateItem</strong> to modify specific attributes directly without fetching the item first!
      </>
    ),
    keyTakeaways: [
      <>UpdateItem changes only the attributes you name, and it creates the item if the key doesn&apos;t exist yet (add a condition like <code>attribute_exists(#name)</code> to prevent that).</>,
      <>Use UpdateExpression to define what changes to make (SET, REMOVE, ADD).</>,
      <>ExpressionAttributeValues act as variables to keep your expressions clean and secure.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiEdit, "The Power of UpdateItem"),
        paragraphs: [
          <>
            Unlike <code>PutItem</code>, which replaces the entire item, <code>UpdateItem</code> allows you to modify specific attributes.
            This is efficient because you don&apos;t need to send the whole item payload back to DynamoDB.
          </>,
          <>
            You use an <strong>UpdateExpression</strong> to tell DynamoDB exactly what to do. The most common action is <code>SET</code>.
          </>
        ],
        bullets: [
          <><strong>SET</strong>: Overwrites an attribute or creates it if it doesn&apos;t exist.</>,
          <><strong>REMOVE</strong>: Deletes an attribute from the item.</>,
          <><strong>ADD</strong>: Adds to a number (atomic counter; a missing attribute starts at 0) or adds elements to a set.</>,
          <><strong>DELETE</strong>: Removes elements from a set.</>
        ],
        visual: <LessonScene questId="quest-6" />,
      },
      {
        title: headingWithIcon(FiSettings, "Using Expression Attributes"),
        paragraphs: [
          <>
            To prevent injection attacks and handle reserved words safely, DynamoDB uses placeholders in expressions.
            You define the placeholder in the expression and bind the actual value in <code>ExpressionAttributeValues</code>.
          </>
        ],
        callout: (
          <>
            <code>Level</code> is reserved, so this example uses <code>#level</code> and maps it to <code>Level</code> in <code>ExpressionAttributeNames</code>. The Expression Attributes quest explains this pattern in depth.
          </>
        ),
        codeSnippets: [
          {
            label: "UpdateItem Example",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new UpdateCommand({
  TableName: "Pokemon",
  Key: { Name: "Mew" },
  ExpressionAttributeNames: { "#level": "Level" },
  UpdateExpression: "SET #level = :newLevel",
  ExpressionAttributeValues: {
    ":newLevel": 6
  }
}));`
          }
        ],
        postTableParagraphs: [
          <>
            Here, <code>:newLevel</code> is a placeholder. DynamoDB swaps it with the value <code>6</code> safely at runtime.
          </>
        ]
      }
    ],
    quiz: {
      prompt: <>Which UpdateExpression action would you use to change an existing attribute&apos;s value?</>,
      options: [
        "A) MODIFY",
        "B) CHANGE",
        "C) SET",
        "D) UPDATE"
      ],
      answer: <>SET is used to create or update attributes.</>
    }
  },
  "quest-7": {
    intro: (
      <>
        Battle statistics change fast! If two players battle at the same time, you could have a <strong>race condition</strong>.
        If both read &quot;Wins: 10&quot;, add 1, and write &quot;Wins: 11&quot;, one win is lost forever.
        DynamoDB solves this with <strong>Atomic Counters</strong> using the <code>ADD</code> action.
      </>
    ),
    keyTakeaways: [
      <>Race conditions occur when parallel updates overwrite each other.</>,
      <>The ADD action atomically increments numeric values in DynamoDB.</>,
      <>Atomic increments are not idempotent: retrying an uncertain write can count twice. Use deduplication or a transaction when exact counts matter.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiAlertTriangle, "The Race Condition Problem"),
        paragraphs: [
          <>
            Imagine thousands of players battling at once. A traditional read-modify-write pattern is dangerous:
          </>,
        ],
        bullets: [
          <>Read current stats (Wins: 10)</>,
          <>Application adds 1 (Wins: 11)</>,
          <>Write back (Wins: 11)</>
        ],
        callout: (
          <>
            If two requests happen simultaneously, both see &quot;10&quot;, and both write &quot;11&quot;. The total should be &quot;12&quot;, but one update is lost!
          </>
        ),
        visual: <LessonScene questId="quest-7" />,
      },
      {
        title: headingWithIcon(FiTrendingUp, "Atomic Counters to the Rescue"),
        paragraphs: [
          <>
            DynamoDB supports atomic updates. You tell it &quot;Add 1 to this attribute&quot; rather than &quot;Set this attribute to 11&quot;.
            Each update is atomic, so concurrent increments do not overwrite one another. A timeout can still leave the outcome uncertain; blindly retrying can increment again.
          </>
        ],
        codeSnippets: [
          {
            label: "Atomic Increment Example",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new UpdateCommand({
  TableName: "Pokemon",
  Key: { Name: "Mew" },
  UpdateExpression: "ADD BattlesWon :inc",
  ExpressionAttributeValues: {
    ":inc": 1
  }
}));`
          }
        ]
      }
    ],
    quiz: {
      prompt: <>Why should you use atomic counters instead of read-modify-write for game stats?</>,
      options: [
        "A) It is faster to write code",
        "B) It prevents race conditions and lost updates",
        "C) It uses less storage space",
        "D) It is required by the API"
      ],
      answer: <>Atomic counters ensure data consistency even with concurrent updates.</>
    }
  },
  "quest-8": {
    intro: (
      <>
        It&apos;s time to release Mew back into the wild. Deleting data is a serious operation!
        The <code>DeleteItem</code> operation removes an item from your table.
        But wait! What if you delete the wrong Pokémon? You should always use a condition to verify what you&apos;re deleting.
      </>
    ),
    keyTakeaways: [
      <>DeleteItem permanently removes an item from the table.</>,
      <>Use ConditionExpression to ensure you delete the correct item.</>,
      <>A common pattern is checking attribute_exists() or matching a version number.</>,
          <>Need an undo button? A <em>soft delete</em> just sets a flag like <code>#status = &quot;Released&quot;</code> (or a TTL timestamp) instead of removing the item.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiTrash2, "The Delete Operation"),
        paragraphs: [
          <>
            <code>DeleteItem</code> is straightforward: give it a key, and the item is gone.
            However, it is <strong>idempotent</strong>: if you delete an item that doesn&apos;t exist, DynamoDB still returns success!
          </>,
        ],
        callout: (
          <>
            This can be confusing. Did I delete it? Was it already gone? To be sure, use a condition, or pass <code>ReturnValues: &quot;ALL_OLD&quot;</code> to get back the item that was actually deleted (nothing comes back if it wasn&apos;t there).
          </>
        )
      },
      {
        title: headingWithIcon(FiShield, "Safe Deletes"),
        paragraphs: [
          <>
            To prevent accidents (like deleting a Pokémon that isn&apos;t yours, or one that was already transferred), use a <strong>ConditionExpression</strong>.
          </>,
          <>
            Common checks include:
          </>
        ],
        bullets: [
          <><code>attribute_exists(#name)</code>, with <code>#name</code> mapped to <code>Name</code>: Only delete if it actually exists.</>,
          <><code>#status = :s</code> (with <code>#status</code> mapped to <code>Status</code>): Only delete if status is &quot;Released&quot;.</>,
          <><code>#own = :o</code> (with <code>#own</code> mapped to <code>Owner</code>): Only delete if you are the owner.</>
        ],
        callout: (
          <>
            Heads-up: we alias <code>Name</code> as <code>#name</code> because it&apos;s a DynamoDB
            reserved word — and so is <code>Owner</code>. In the <strong>Expression Attributes</strong>{" "}
            quest you&apos;ll learn to alias reserved names with a <code>#</code> placeholder so
            expressions never fail validation.
          </>
        ),
        codeSnippets: [
          {
            label: "Safe Delete Example",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new DeleteCommand({
  TableName: "Pokemon",
  Key: { Name: "Mew" },
  ExpressionAttributeNames: { "#name": "Name" },
  ConditionExpression: "attribute_exists(#name)"
}));`
          }
        ],
        visual: <LessonScene questId="quest-8" />,
      }
    ],
    quiz: {
      prompt: <>What happens if you run DeleteItem on a key that doesn&apos;t exist (without a condition)?</>,
      options: [
        "A) It throws a ResourceNotFoundException",
        "B) It creates a new empty item",
        "C) It returns success (200 OK)",
        "D) It corrupts the table"
      ],
      answer: <>DeleteItem is idempotent and returns success even if the item wasn&apos;t found, unless you use a ConditionExpression.</>
    }
  },
  "quest-expressions": {
    intro: (
      <>
        You&apos;ve mastered the core operations of Kanto — but before you step into Johto&apos;s
        advanced patterns, you need to speak DynamoDB&apos;s language fluently.
        <br/><br/>
        Almost every Query, Update, and Condition you&apos;ll write from here on leans on two kinds of
        placeholder: <strong>ExpressionAttributeValues</strong> for the data you compare or write, and{" "}
        <strong>ExpressionAttributeNames</strong> for the attribute names themselves. Master these and
        no expression in Johto can surprise you.
      </>
    ),
    keyTakeaways: [
      <>Placeholders starting with <code>:</code> live in <code>ExpressionAttributeValues</code> and stand in for actual data values.</>,
      <>Placeholders starting with <code>#</code> live in <code>ExpressionAttributeNames</code> and stand in for attribute names.</>,
      <>You <em>must</em> alias a name with <code>#</code> whenever the attribute&apos;s name is a DynamoDB reserved word (like <code>Status</code>, <code>Name</code>, or <code>Type</code>) or contains special characters such as <code>.</code> or <code>-</code>.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiShield, "Values: the ':' placeholders"),
        paragraphs: [
          <>
            You never paste raw data directly into an expression string. Instead you write a
            placeholder like <code>:atk</code> and bind the real value separately in{" "}
            <code>ExpressionAttributeValues</code>. DynamoDB substitutes it safely at runtime — this
            prevents injection-style mistakes and lets the Document Client convert each value to the correct DynamoDB type.
          </>,
        ],
        codeSnippets: [
          {
            label: "Binding a value with :",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new UpdateCommand({
  TableName: "Pokemon",
  Key: { Name: "Mew" },
  UpdateExpression: "SET Attack = :atk",
  ExpressionAttributeValues: {
    ":atk": 120,
  },
}));`,
          },
        ],
        postTableParagraphs: [
          <>
            The expression references <code>:atk</code>; the actual number <code>120</code> is bound
            on the side. You can change the value without ever editing the expression string. (<code>Attack</code>{" "}
            isn&apos;t a reserved word, so it&apos;s safe to use directly — more on that next.)
          </>,
        ],
      },
      {
        title: headingWithIcon(GiBrickWall, "Names: the '#' placeholders & reserved words"),
        paragraphs: [
          <>
            DynamoDB reserves hundreds of words — <code>Status</code>, <code>Name</code>,{" "}
            <code>Type</code>, <code>Comment</code>, and many more. If one of your attributes is named
            after a reserved word, using it directly in an expression throws a validation error.
          </>,
          <>
            The fix is an <strong>ExpressionAttributeName</strong>: a placeholder starting with{" "}
            <code>#</code> that stands in for the attribute name itself.
          </>,
        ],
        table: {
          headers: ["Attribute name", "Reserved?", "How to reference it"],
          rows: [
            ["Attack", "No", "Use directly: SET Attack = :v"],
            ["Status", "Yes", "Alias it: SET #s = :v"],
            ["Name", "Yes", "Alias it: attribute_exists(#n)"],
          ],
          caption: "When in doubt, alias the name — using # always works, reserved or not.",
        },
        visual: <LessonScene questId="quest-expressions" />,
      },
      {
        title: headingWithIcon(FaPuzzlePiece, "Putting them together"),
        paragraphs: [
          <>
            Most real expressions use both at once: <code>#</code> for the attribute name and{" "}
            <code>:</code> for its value.
          </>,
        ],
        codeSnippets: [
          {
            label: "Updating a reserved-word attribute",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new UpdateCommand({
  TableName: "Pokemon",
  Key: { Name: "Mew" },
  UpdateExpression: "SET #status = :status",
  ExpressionAttributeNames: {
    "#status": "Status",
  },
  ExpressionAttributeValues: {
    ":status": "Champion",
  },
}));`,
          },
        ],
        postTableParagraphs: [
          <>
            Read it as: &ldquo;Set the attribute <code>#status</code> (which is really{" "}
            <code>Status</code>) to the value <code>:status</code> (which is{" "}
            <code>&quot;Champion&quot;</code>).&rdquo;
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>Your Pokémon item has an attribute named <code>Status</code> — a DynamoDB reserved word. How do you safely set it in an UpdateExpression?</>,
      options: [
        "A) Use ExpressionAttributeValues only: SET Status = :status",
        "B) Use an ExpressionAttributeName: SET #status = :status, mapping #status to \"Status\"",
        "C) Wrap the word in quotes: SET \"Status\" = :status",
        "D) Reserved words can't be updated — rename the attribute first",
      ],
      answer: <>A # name placeholder (ExpressionAttributeNames) aliases the reserved word so DynamoDB accepts the expression.</>
    },
  },
  "quest-9": {
    intro: (
      <>
        Welcome to the Johto Region! Now that you&apos;ve mastered the basics of DynamoDB in Kanto, it&apos;s time to learn the advanced patterns that make DynamoDB truly powerful.
        <br/><br/>
        In Kanto, we learned that DynamoDB items are stored based on their <strong>Partition Key</strong>. But what if you need to look up a Pokémon by its <code>Type1</code> instead of its <code>Name</code>? 
        A <strong>Global Secondary Index (GSI)</strong> is like a secondary Pokédex. It automatically copies data from your main table but uses a different attribute as the Partition Key.
      </>
    ),
    keyTakeaways: [
      <>GSIs allow querying on non-primary key attributes.</>,
      <>Data is asynchronously replicated from the base table to the index.</>,
      <>Every GSI adds storage and write cost; project only attributes the access pattern needs (a Query on the index returns only projected attributes). Items missing the index key are left out, which makes the index sparse.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiDatabase, "Creating a GSI"),
        paragraphs: [
          <>
            You create an index on the table and choose a new Partition Key (and optionally a new Sort Key).
            For our Johto Pokédex, we want to find all <code>Water</code> type Pokémon quickly, so we use <code>Type1</code> as the Partition Key for the GSI.
            GSI reads are eventually consistent, and a low-cardinality value such
            as Type1 can become hot at large scale. Treat this as a teaching model,
            then validate real traffic distribution before production.
          </>,
        ],
        codeSnippets: [
          {
            label: "GSI Query",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new QueryCommand({
  TableName: "JohtoPokemon",
  IndexName: "Type1-Index",
  KeyConditionExpression: "Type1 = :type",
  ExpressionAttributeValues: { ":type": "water" }
}));`
          }
        ],
        visual: <LessonScene questId="quest-9" />,
      }
    ],
    quiz: {
      prompt: <>Why use a Global Secondary Index instead of a Scan to find all Water-type Pokémon?</>,
      options: [
        "A) A Scan is faster.",
        "B) A Scan cannot filter by Type1.",
        "C) A GSI allows direct querying without reading the entire table.",
        "D) GSIs use less storage."
      ],
      answer: <>GSIs allow direct querying, which is significantly faster and cheaper than scanning.</>
    }
  },
  "quest-10": {
    intro: (
      <>
        The Johto region is filled with powerful trainers! To become the best, you need to find the strongest Pokémon. 
        By creating a second GSI with a <strong>Sort Key</strong> (<code>Type1-Attack-Index</code>), we can have DynamoDB order our query results automatically.
      </>
    ),
    keyTakeaways: [
      <>Sort Keys automatically organize data within a Partition Key.</>,
      <>Use ScanIndexForward to control ascending or descending order.</>,
      <>A KeyConditionExpression needs an equality test on the partition key (<code>Type1 = :type</code>); the sort key can add <code>=</code>, <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code>, <code>BETWEEN</code>, or <code>begins_with</code> (e.g. <code>Attack &gt;= :min</code>).</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiDatabase, "Sort Keys in GSIs"),
        paragraphs: [
          <>
            If we set <code>Type1</code> as the Partition Key and <code>Attack</code> as the Sort Key, DynamoDB automatically keeps our Water-type Pokémon sorted by their Attack power! (Store Attack as a Number: as a String, &quot;105&quot; would sort before &quot;65&quot;.)
            When querying, you can easily fetch the strongest Water Pokémon by reading the items in reverse order.
          </>,
        ],
        codeSnippets: [
          {
            label: "Query with Sort Key",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new QueryCommand({
  TableName: "JohtoPokemon",
  IndexName: "Type1-Attack-Index",
  KeyConditionExpression: "Type1 = :type",
  ExpressionAttributeValues: { ":type": "water" },
  ScanIndexForward: false // false means descending order (highest attack first!)
}));`
          }
        ],
        visual: <LessonScene questId="quest-10" />,
      }
    ],
    quiz: {
      prompt: <>How do you fetch items in descending order (highest to lowest) using a Query in DynamoDB?</>,
      options: [
        "A) SortDirection: 'DESC'",
        "B) ScanIndexForward: false",
        "C) OrderBy: 'DESC'",
        "D) ReverseIndex: true"
      ],
      answer: <>ScanIndexForward controls the read direction of the sort key.</>
    }
  },
  "quest-11": {
    intro: (
      <>
        You&apos;ve encountered Lugia, the Guardian of the Seas! You throw a Master Ball, but what if another trainer threw one at the exact same millisecond? 
        We don&apos;t want two trainers owning the exact same legendary instance in the database.
      </>
    ),
    keyTakeaways: [
      <>Condition Expressions enforce rules before writing to DynamoDB.</>,
      <>UpdateItem can create a new item, so also assert that the target key exists.</>,
      <>Conditional checks occur server-side, preventing race conditions.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiAlertTriangle, "Safe Legendary Catches"),
        paragraphs: [
          <>
            By adding a <code>ConditionExpression</code> to our <code>UpdateItem</code> call, we can tell DynamoDB: &quot;Only assign ownership if this Lugia exists and has no owner.&quot;
            If someone else caught it a millisecond earlier, the condition fails and DynamoDB throws a <code>ConditionalCheckFailedException</code>.
          </>,
        ],
        codeSnippets: [
          {
            label: "Conditional Write",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new UpdateCommand({
  TableName: "LegendaryPokemon",
  Key: { Name: "Lugia" },
  UpdateExpression: "SET #own = :trainer",
  ConditionExpression: "attribute_exists(#name) AND attribute_not_exists(#own)",
  ExpressionAttributeNames: { "#name": "Name", "#own": "Owner" },
  ExpressionAttributeValues: { ":trainer": "Ash" }
}));`
          }
        ],
        callout: (
          <>
            Note: &quot;Owner&quot; is a reserved word in DynamoDB, so we use <code>ExpressionAttributeNames</code> (like <code>#own</code>) to map it safely!
          </>
        ),
        visual: <LessonScene questId="quest-11" />,
      }
    ],
    quiz: {
      prompt: <>What DynamoDB function checks if an attribute is missing before allowing a write?</>,
      options: [
        "A) is_null()",
        "B) attribute_not_exists()",
        "C) CheckEmpty()",
        "D) condition_missing()"
      ],
      answer: <>attribute_not_exists() ensures an item or attribute isn&apos;t already there.</>
    }
  },
  "quest-12": {
    intro: (
      <>
        You want to trade your Scyther for your rival&apos;s Onix. This involves two database updates:
        1) Set Scyther&apos;s owner to your rival, 2) Set Onix&apos;s owner to you.
        If step 1 succeeds but step 2 fails, you&apos;ve lost your Pokémon! DynamoDB <strong>Transactions</strong> prevent this.
      </>
    ),
    keyTakeaways: [
      <>TransactWriteItems supports up to 100 distinct items totaling 4 MB, within one AWS account and Region. No two actions may target the same item.</>,
      <>Either all operations succeed, or they all fail together.</>,
      <>Transactions use two underlying writes per item. Reuse a ClientRequestToken for identical application retries within its 10-minute idempotency window.</>,
      <>Condition each write on the expected owner to prevent a stale trade from overwriting newer state.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiLayers, "Trading Pokémon Safely (ACID)"),
        paragraphs: [
          <>
            By wrapping our updates in a <code>TransactWriteItems</code> call, we ensure that the trade is atomic.
            If the Onix condition fails (maybe it was already traded!), DynamoDB cancels the whole transaction with a <code>TransactionCanceledException</code> (its <code>CancellationReasons</code> say which action failed), so Scyther never changes hands either.
          </>,
        ],
        codeSnippets: [
          {
            label: "TransactWriteItems",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new TransactWriteCommand({
  TransactItems: [
    {
      Update: {
        TableName: "TrainerPokemon",
        Key: { Name: "Scyther" },
        UpdateExpression: "SET #own = :rival",
        ExpressionAttributeNames: { "#own": "Owner" },
        ExpressionAttributeValues: { ":rival": "Gary", ":expected": "Ash" },
        ConditionExpression: "#own = :expected"
      }
    },
    {
      Update: {
        TableName: "TrainerPokemon",
        Key: { Name: "Onix" },
        UpdateExpression: "SET #own = :you",
        ExpressionAttributeNames: { "#own": "Owner" },
        ExpressionAttributeValues: { ":you": "Ash", ":expected": "Gary" },
        ConditionExpression: "#own = :expected"
      }
    }
  ]
}));`
          }
        ],
        visual: <LessonScene questId="quest-12" />,
      }
    ],
    quiz: {
      prompt: <>What DynamoDB operation guarantees that multiple item updates either all succeed or all fail?</>,
      options: [
        "A) BatchWriteItem",
        "B) PutItem",
        "C) TransactWriteItems",
        "D) UpdateMultiple"
      ],
      answer: <>TransactWriteItems provides ACID guarantees across up to 100 actions.</>
    }
  },
  "quest-13": {
    intro: (
      <>
        You arrive at the Pokémon Center to load your party. Instead of making
        separate reads, use <strong>BatchGetItem</strong>—while handling the
        partial responses a production system can return.
      </>
    ),
    keyTakeaways: [
      <>Batch operations process multiple items in a single network request.</>,
      <>BatchGetItem accepts up to 100 keys and returns at most 16 MB per request; partial results can also occur above 1 MB per partition.</>,
      <>Responses are unordered and may contain UnprocessedKeys that must be retried.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiLayers, "Healing the Party (BatchGetItem)"),
        paragraphs: [
          <>
            By passing an array of keys to <code>BatchGetItem</code>, we reduce
            network round trips. A successful HTTP response can still be
            partial, so merge responses by key and retry UnprocessedKeys with
            exponential backoff and jitter.
          </>,
        ],
        codeSnippets: [
          {
            label: "BatchGetItem",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Re-send any UnprocessedKeys with backoff (see the lab below).
const { Responses, UnprocessedKeys } = await docClient.send(new BatchGetCommand({
  RequestItems: {
    "JohtoPokemon": {
      Keys: [
        { Name: "Chikorita" },
        { Name: "Cyndaquil" },
        { Name: "Totodile" }
      ]
    }
  }
}));`
          }
        ],
        visual: <LessonScene questId="quest-13" />,
      }
    ],
    quiz: {
      prompt: <>What is the maximum number of items you can retrieve in a single BatchGetItem request?</>,
      options: [
        "A) 10",
        "B) 25",
        "C) 50",
        "D) 100"
      ],
      answer: <>BatchGetItem supports up to 100 items per request.</>
    }
  },
  "quest-14": {
    intro: (
      <>
        The Johto Pokédex has 100 new Pokémon. Loading them all at once is slow and expensive. 
        Instead, we fetch the first 10. DynamoDB returns a <code>LastEvaluatedKey</code>, telling us exactly where it stopped.
      </>
    ),
    keyTakeaways: [
      <>Each Query or Scan call reads at most 1 MB (before any filter), so you must paginate even without a Limit.</>,
      <>Limit controls items evaluated, not necessarily items returned after filtering.</>,
      <>Pass the LastEvaluatedKey back as the ExclusiveStartKey to get the next page.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiLayers, "Scrolling the Pokegear"),
        paragraphs: [
          <>
            When you scan or query, <code>Limit</code> caps the items DynamoDB
            evaluates before applying a filter. The returned item count can
            therefore be smaller or even zero. Continue while <code>LastEvaluatedKey</code> is present; only an absent or empty key establishes that traversal is finished.
            To get the next page, you start exactly where you left off by passing that key as the <code>ExclusiveStartKey</code>.
          </>,
        ],
        codeSnippets: [
          {
            label: "Pagination Request",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Fetching Page 2
await docClient.send(new ScanCommand({
  TableName: "JohtoPokemon",
  Limit: 10,
  ExclusiveStartKey: { Name: "Meganium" } // This came from the previous request's LastEvaluatedKey
}));`
          }
        ],
        visual: <LessonScene questId="quest-14" />,
      }
    ],
    quiz: {
      prompt: <>Which parameter do you use to tell DynamoDB where to start reading the next page of results?</>,
      options: [
        "A) NextToken",
        "B) Offset",
        "C) ExclusiveStartKey",
        "D) StartingIndex"
      ],
      answer: <>ExclusiveStartKey is used to resume reading from the LastEvaluatedKey.</>
    }
  },
  "quest-15": {
    intro: (
      <>
        Your Pokémon gets &quot;Burned&quot; in battle. Use an expiry timestamp to end the effect in your application after 5 minutes, and DynamoDB <strong>Time To Live (TTL)</strong> to clean up the stored item later.
      </>
    ),
    keyTakeaways: [
      <>TTL marks items for asynchronous background deletion; expiration is not immediate.</>,
      <>The TTL attribute must be a Number type representing Epoch Seconds.</>,
      <>Expired items can remain visible for days, so application reads should filter them out.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiLayers, "Burn Heal (TTL)"),
        paragraphs: [
          <>
            Add an <code>ExpirationTime</code> attribute and enable that exact
            attribute as the table&apos;s TTL setting. Once the timestamp passes,
            the item becomes eligible for background deletion. Until DynamoDB
            removes it, your application must treat it as expired, for example by adding <code>FilterExpression: &quot;ExpirationTime &gt; :now&quot;</code> to reads.
          </>,
        ],
        codeSnippets: [
          {
            label: "Writing an item with TTL",
            language: "javascript",
            code: `import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

await docClient.send(new PutCommand({
  TableName: "StatusEffects",
  Item: {
    PokemonId: "Pikachu",
    Effect: "Burn",
    // Eligible for background deletion after 5 minutes; not an exact timer.
    ExpirationTime: Math.floor(Date.now() / 1000) + 300 
  }
}));`
          }
        ],
        visual: <LessonScene questId="quest-15" />,
      }
    ],
    quiz: {
      prompt: <>What format must the TTL attribute be in for DynamoDB to automatically delete the item?</>,
      options: [
        "A) ISO-8601 String",
        "B) Epoch Milliseconds",
        "C) Epoch Seconds (Number)",
        "D) Date Object"
      ],
      answer: <>TTL requires a Number attribute representing the expiration time in Epoch Seconds.</>
    }
  },
  "quest-16": {
    intro: (
      <>
        A correct API call is not yet a production system. In this final design
        review, you will connect DynamoDB&apos;s data model to traffic shape,
        consistency, recovery, security, event processing, and operations.
      </>
    ),
    keyTakeaways: [
      <>Capacity mode does not fix a hot key; distribute high-volume writes across well-chosen partition key values.</>,
      <>Eventually consistent reads are the default; request strong consistency only for base-table or LSI reads that truly require it.</>,
      <>Streams, backups, encryption, alarms, and restore drills are part of the design—not post-launch extras.</>,
    ],
    sections: [
      {
        title: headingWithIcon(FiLayers, "Choose your global table consistency mode"),
        paragraphs: [
          <>MREC is the default: writes replicate asynchronously and concurrent changes use last-writer-wins reconciliation. Transactions are atomic in the originating Region, not across replicas.</>,
          <>MRSC synchronously replicates writes and supports strongly consistent reads across replicas. It currently does not support TTL or transaction APIs. GSIs remain eventually consistent. These tradeoffs matter more than simply enabling a global table.</>,
          <>The lab chooses MREC to retain TTL and regional transactions. Its productionPlan is a teaching checklist, not an AWS SDK input object.</>,
        ],
      },
      {
        title: headingWithIcon(FiTrendingUp, "Scale and consistency"),
        paragraphs: [
          <>
            On-demand capacity is a strong default for unknown or spiky traffic,
            while provisioned capacity can be economical for predictable loads.
            Both modes still depend on well-distributed partition keys. A hot
            battle feed may need deterministic write sharding such as{" "}
            <code>BATTLE#2026-07-17#03</code> and a fan-out read across shards.
          </>,
          <>
            DynamoDB read cost depends on item size and consistency. Prefer
            eventual reads where the application tolerates slight lag; use
            strong reads deliberately. GSI and Streams reads are eventually
            consistent, so workflows must tolerate propagation delay.
          </>,
        ],
        callout: <>Adaptive capacity helps uneven traffic, but it is not permission to design a permanently hot partition key.</>,
      },
      {
        title: headingWithIcon(FiLayers, "Events, regions, and recovery"),
        bullets: [
          <>Use DynamoDB Streams for change-data capture. Each change appears exactly once in the stream (ordered per item), but consumers such as Lambda retry failed batches, so processing must be idempotent.</>,
          <>Global tables offer MREC (eventual replication with last-writer-wins conflict resolution) and MRSC (strong reads across replicas when requested). Choose explicitly and check supported Regions before deployment.</>,
          <>Enable point-in-time recovery with a 1–35 day recovery period; restores create a new table. Regularly test restoration and application cutover.</>,
          <>Keep objects approaching DynamoDB&apos;s 400 KB item limit in S3 and store only metadata and an object key in DynamoDB.</>,
        ],
      },
      {
        title: headingWithIcon(FiShield, "Security and operations"),
        paragraphs: [
          <>
            DynamoDB always encrypts data at rest; choose the KMS key type (AWS owned, AWS managed, or customer managed) your compliance needs, use TLS in
            transit, and grant least-privilege IAM permissions scoped to the
            required tables, indexes, actions, and leading keys where possible.
          </>,
        ],
        bullets: [
          <>Monitor throttled requests, system errors, latency, consumed capacity, and account/table limits.</>,
          <>Load-test real access patterns and item sizes; averages hide the hot keys that fail first.</>,
          <>Document retry policy with exponential backoff and jitter, idempotency strategy, cost budget, and regional failure behavior.</>,
          <>Use DAX only after measuring a read-heavy, eventually consistent cacheable workload; it does not repair a poor key design.</>,
        ],
      },
    ],
    quiz: {
      prompt: <>Which statement is the strongest production review conclusion?</>,
      options: [
        "A) On-demand mode eliminates hot partitions",
        "B) PITR means restore drills are unnecessary",
        "C) A production design must validate key distribution, failure behavior, recovery, security, cost, and observability together",
        "D) Global Tables make every read strongly consistent",
      ],
      answer: <>No single DynamoDB feature replaces a tested operating model.</>
    },
  }
};

/** Content with stable React keys on every array element (see with-keys.ts). */
/** Section labels are computed here, while titles are still plain elements (before RSC serialization). */
const labelled = Object.fromEntries(
  Object.entries(rawQuestContent).map(([slug, c]) => [slug, { ...c, sections: c.sections.map((sec) => ({ ...sec, label: sec.label ?? nodeText(sec.title).trim() })) }])
) as Record<string, QuestContent>;

export const questContent = withKeys(labelled);
