import { availableQuests, quests, type QuestMeta } from "./quests";
import type { CourseConfig } from "@/lib/learn/types";

/** Each quest is hosted by one Data Critter (components/dynamodb/scene/critter-svg.tsx). */
const GUIDES: Record<string, string> = {
  "quest-1": "Psychic",
  "quest-2": "Normal",
  "quest-3": "Water",
  "quest-4": "Grass",
  "quest-5": "Psychic",
  "quest-6": "Electric",
  "quest-7": "Fire",
  "quest-8": "Flying",
  "quest-expressions": "Psychic",
  "quest-9": "Water",
  "quest-10": "Rock",
  "quest-11": "Flying",
  "quest-12": "Normal",
  "quest-13": "Grass",
  "quest-14": "Electric",
  "quest-15": "Fire",
  "quest-16": "Rock",
};

export const REGIONS = {
  Kanto: {
    part: "Part 1",
    title: "Foundations",
    blurb: "Keys, hashing and every single-item operation — reads, scans, safe writes, updates, counters and deletes.",
    badge: "/dynamodb/badges/kanto-badge.png",
    color: "var(--sc-kanto)",
    ink: "#a8402a",
  },
  Johto: {
    part: "Part 2",
    title: "Advanced patterns",
    blurb: "Expressions, indexes, transactions, batches, pagination, TTL — and a production review to finish.",
    badge: "/dynamodb/badges/johto-badge.png",
    color: "var(--sc-johto)",
    ink: "#3a43b8",
  },
} as const;

export const guideFor = (slug: string) => GUIDES[slug] ?? "Psychic";

export function questNumber(slug: string) {
  const i = availableQuests.findIndex((q) => q.slug === slug);
  return i < 0 ? "" : String(i + 1).padStart(2, "0");
}

export function questNeighbours(slug: string): { prev: QuestMeta | null; next: QuestMeta | null } {
  const i = availableQuests.findIndex((q) => q.slug === slug);
  return {
    prev: i > 0 ? availableQuests[i - 1] : null,
    next: i >= 0 && i < availableQuests.length - 1 ? availableQuests[i + 1] : null,
  };
}

/** True when this quest is the final lesson of its region. */
export function closesRegion(meta: QuestMeta) {
  const region = availableQuests.filter((q) => q.region === meta.region);
  return region[region.length - 1]?.slug === meta.slug;
}

export const minutes = (duration: string) => parseInt(duration, 10) || 0;

export const dynamodbCourse: CourseConfig = {
  id: "dynamodb",
  name: "Learn DynamoDB",
  service: "Amazon DynamoDB",
  basePath: "/dynamodb",
  // Unchanged since v1 so existing learners keep their badges.
  storageKey: "serverlesscreed:dynamodb:progress:v1",
  certificates: { checkAnswerEndpoint: "/api/dynamodb/check-answer" },
  regions: REGIONS,
  regionOrder: ["Kanto", "Johto"],
  quests,
  guides: GUIDES,
  badgeId: (slug, hasChallenge) => (hasChallenge ? `dynamodb-stamp-${slug}` : `${slug}-badge`),
  home: {
    headline: ["Catch Pokémon.", "Master DynamoDB."],
    lede: "Watch every request travel through partitions, write real AWS SDK code against a simulated table, and earn a badge for each concept you master.",
    howItWorks: [
      { title: "Learn by watching", body: "Animated scenes show each request hashing to a partition — and what breaks without the right pattern." },
      { title: "Practice with real code", body: "Write AWS SDK v3 code. A simulated DynamoDB checks it and replays exactly what happened." },
      { title: "Check and collect", body: "One question per quest. Get it right and the badge is yours." },
    ],
    whyOrder:
      "Partition-key choices only make sense once you understand access patterns, hashing and how traffic spreads. Kanto teaches those ideas first, so every later code challenge builds on something you've already seen happen.",
    whyGuide: "Psychic",
    footer: "practice runs on simulated data — no AWS account, no credentials, no signup.",
  },
};
