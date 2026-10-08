import type { QuestMeta as SharedQuestMeta } from "@/lib/learn/types";

export type QuestMeta = SharedQuestMeta & { region: "Unova" | "Kalos" };

const q = (m: Omit<QuestMeta, "accentColor" | "accentForegroundColor" | "status">): QuestMeta => ({
  accentColor: m.region === "Unova" ? "#2f6fdb" : "#d6477a",
  accentForegroundColor: "#FFFFFF",
  status: "available",
  ...m,
});

/** Learn CDK: the Pokédex team stops clicking in the console and describes its backend as code. */
export const quests: QuestMeta[] = [
  q({
    slug: "quest-1",
    title: "Code Instead of Clicks",
    subtitle: "Meet the app, the stack and the construct, and describe the Pokédex backend in code.",
    topics: ["App", "Stack", "cdk synth"],
    region: "Unova",
    difficulty: "Beginner",
    duration: "12 min",
  }),
  q({
    slug: "quest-2",
    title: "Your First Bucket",
    subtitle: "Create a card bucket with one line of L2 code and see the CloudFormation it becomes.",
    topics: ["s3.Bucket", "L2 constructs", "Removal policy"],
    region: "Unova",
    difficulty: "Beginner",
    duration: "14 min",
  }),
  q({
    slug: "quest-3",
    title: "A Table with Keys",
    subtitle: "Describe a DynamoDB table with its keys, billing mode and a secondary index.",
    topics: ["dynamodb.Table", "Keys", "GSI"],
    region: "Unova",
    difficulty: "Beginner",
    duration: "14 min",
  }),
  q({
    slug: "quest-4",
    title: "Wire Up a Function",
    subtitle: "Add a Lambda function, pick a supported runtime, and hand it the table name without hard-coding it.",
    topics: ["lambda.Function", "Runtimes", "Environment"],
    region: "Unova",
    difficulty: "Intermediate",
    duration: "14 min",
  }),
  q({
    slug: "quest-5",
    title: "Grant, Don't Hand-Write",
    subtitle: "Replace a wildcard IAM policy with the narrow grants CDK generates for you.",
    topics: ["Grants", "Least privilege", "IAM"],
    region: "Unova",
    difficulty: "Intermediate",
    duration: "15 min",
  }),
  q({
    slug: "quest-6",
    title: "Tokens and Outputs",
    subtitle: "Understand values that only exist at deploy time, and export them with stack outputs.",
    topics: ["Tokens", "CfnOutput", "References"],
    region: "Unova",
    difficulty: "Intermediate",
    duration: "14 min",
  }),
  q({
    slug: "quest-7",
    title: "Put an API in Front",
    subtitle: "Expose the lookup function through API Gateway with resources, path parameters and a Lambda integration.",
    topics: ["API Gateway", "REST API", "Integrations"],
    region: "Kalos",
    difficulty: "Intermediate",
    duration: "15 min",
  }),
  q({
    slug: "quest-8",
    title: "Thumbnails on Upload",
    subtitle: "Trigger a function when a sprite lands in the bucket, without creating an infinite loop.",
    topics: ["Event notifications", "Lambda", "Filters"],
    region: "Kalos",
    difficulty: "Advanced",
    duration: "14 min",
  }),
  q({
    slug: "quest-9",
    title: "Dev, Staging and Prod",
    subtitle: "Deploy the same stack to several environments, and make production keep its data.",
    topics: ["Stack props", "Environments", "Tags"],
    region: "Kalos",
    difficulty: "Advanced",
    duration: "16 min",
  }),
  q({
    slug: "quest-10",
    title: "Test Your Stack",
    subtitle: "Write fine-grained assertions against the synthesized template before anything is deployed.",
    topics: ["assertions", "Template", "Match"],
    region: "Kalos",
    difficulty: "Advanced",
    duration: "15 min",
  }),
  q({
    slug: "quest-11",
    title: "Build Your Own Construct",
    subtitle: "Package a secure bucket as a reusable construct so every team gets the same defaults.",
    topics: ["Custom constructs", "Composition", "Logical IDs"],
    region: "Kalos",
    difficulty: "Advanced",
    duration: "16 min",
  }),
  q({
    slug: "quest-12",
    title: "Champion's Launch Review",
    subtitle: "Review the finished stack for safety, change management, cost and delivery before launch.",
    topics: ["cdk diff", "Bootstrapping", "Pipelines"],
    region: "Kalos",
    difficulty: "Advanced",
    duration: "18 min",
  }),
];

export const availableQuests = quests.filter((quest) => quest.status === "available");

export function getQuestMeta(slug: string): QuestMeta | undefined {
  return availableQuests.find((quest) => quest.slug === slug);
}
