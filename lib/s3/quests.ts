import type { QuestMeta as SharedQuestMeta } from "@/lib/learn/types";

export type QuestMeta = SharedQuestMeta & { region: "Hoenn" | "Sinnoh" };

const q = (m: Omit<QuestMeta, "accentColor" | "accentForegroundColor" | "status">): QuestMeta => ({
  accentColor: m.region === "Hoenn" ? "#1f9d6b" : "#8a5cc7",
  accentForegroundColor: "#FFFFFF",
  status: "available",
  ...m,
});

/** Learn S3: the Pokédex team moves its cards, sprites and battle replays into Amazon S3. */
export const quests: QuestMeta[] = [
  q({
    slug: "quest-1",
    title: "Buckets, Keys and the Flat Namespace",
    subtitle: "Create a bucket for the Hoenn Pokédex and learn why S3 has keys, not folders.",
    topics: ["Buckets", "Object keys", "Regions"],
    region: "Hoenn",
    difficulty: "Beginner",
    duration: "12 min",
  }),
  q({
    slug: "quest-2",
    title: "Upload Your First Pokédex Card",
    subtitle: "Store Treecko's card with PutObject, set its content type and metadata, and read the ETag S3 sends back.",
    topics: ["PutObject", "Content-Type", "Consistency"],
    region: "Hoenn",
    difficulty: "Beginner",
    duration: "12 min",
  }),
  q({
    slug: "quest-3",
    title: "Read It Back",
    subtitle: "Fetch the card with GetObject, turn the streamed body into text, and check an object with HeadObject.",
    topics: ["GetObject", "HeadObject", "Byte ranges"],
    region: "Hoenn",
    difficulty: "Beginner",
    duration: "12 min",
  }),
  q({
    slug: "quest-4",
    title: "Browse the Box",
    subtitle: "List objects by prefix and delimiter, and page through results 1,000 keys at a time.",
    topics: ["ListObjectsV2", "Prefixes", "Pagination"],
    region: "Hoenn",
    difficulty: "Beginner",
    duration: "14 min",
  }),
  q({
    slug: "quest-5",
    title: "Choose the Right Shelf",
    subtitle: "Match every kind of Pokédex media to a storage class by how often it's read and how fast it must come back.",
    topics: ["Storage classes", "Retrieval", "Cost"],
    region: "Hoenn",
    difficulty: "Intermediate",
    duration: "14 min",
  }),
  q({
    slug: "quest-6",
    title: "Never Lose a Card",
    subtitle: "Turn on versioning, understand delete markers, and use conditional writes so two uploads never clobber each other.",
    topics: ["Versioning", "Conditional writes", "Delete markers"],
    region: "Hoenn",
    difficulty: "Intermediate",
    duration: "15 min",
  }),
  q({
    slug: "quest-7",
    title: "Hand Out a Pass",
    subtitle: "Let trainers upload sprites straight from the browser with a short-lived presigned URL.",
    topics: ["Presigned URLs", "Browser uploads", "Expiry"],
    region: "Sinnoh",
    difficulty: "Intermediate",
    duration: "14 min",
  }),
  q({
    slug: "quest-8",
    title: "Upload the Big Replay",
    subtitle: "Send a multi-gigabyte battle replay in parts, retry only what failed, and clean up uploads that never finish.",
    topics: ["Multipart upload", "Parts", "lib-storage"],
    region: "Sinnoh",
    difficulty: "Advanced",
    duration: "16 min",
  }),
  q({
    slug: "quest-9",
    title: "Tidy the Archive",
    subtitle: "Write lifecycle rules that move old replays to cheaper classes and expire what nobody needs.",
    topics: ["Lifecycle rules", "Transitions", "Expiration"],
    region: "Sinnoh",
    difficulty: "Intermediate",
    duration: "14 min",
  }),
  q({
    slug: "quest-10",
    title: "Lock the Vault",
    subtitle: "Keep the archive private with Block Public Access, least-privilege policies and default encryption.",
    topics: ["Bucket policies", "Block Public Access", "Encryption"],
    region: "Sinnoh",
    difficulty: "Advanced",
    duration: "16 min",
  }),
  q({
    slug: "quest-11",
    title: "React to Uploads",
    subtitle: "Trigger a Lambda function whenever a new sprite lands, and design for events that arrive more than once.",
    topics: ["Event notifications", "Lambda", "EventBridge"],
    region: "Sinnoh",
    difficulty: "Advanced",
    duration: "14 min",
  }),
  q({
    slug: "quest-12",
    title: "Champion's Production Review",
    subtitle: "Review the finished archive for throughput, recovery, compliance, monitoring and cost before launch.",
    topics: ["Performance", "Replication", "Object Lock"],
    region: "Sinnoh",
    difficulty: "Advanced",
    duration: "18 min",
  }),
];

export const availableQuests = quests.filter((quest) => quest.status === "available");

export function getQuestMeta(slug: string): QuestMeta | undefined {
  return availableQuests.find((quest) => quest.slug === slug);
}
