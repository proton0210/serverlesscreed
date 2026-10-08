import type { CourseConfig } from "@/lib/learn/types";
import { quests } from "./quests";

/** Each quest is hosted by one Data Critter (components/dynamodb/scene/critter-svg.tsx). */
const GUIDES: Record<string, string> = {
  "quest-1": "Normal",
  "quest-2": "Grass",
  "quest-3": "Water",
  "quest-4": "Psychic",
  "quest-5": "Rock",
  "quest-6": "Electric",
  "quest-7": "Flying",
  "quest-8": "Fire",
  "quest-9": "Grass",
  "quest-10": "Rock",
  "quest-11": "Electric",
  "quest-12": "Psychic",
};

export const S3_REGIONS = {
  Hoenn: {
    part: "Part 1",
    title: "Foundations",
    blurb: "Buckets, keys and prefixes, every everyday object call, storage classes, versioning and safe overwrites.",
    badge: "/s3/badges/hoenn-badge.svg",
    color: "var(--sc-hoenn)",
    ink: "#17744f",
  },
  Sinnoh: {
    part: "Part 2",
    title: "Advanced patterns",
    blurb: "Presigned URLs, multipart uploads, lifecycle, security, event-driven processing — and a production review to finish.",
    badge: "/s3/badges/sinnoh-badge.svg",
    color: "var(--sc-sinnoh)",
    ink: "#5e3aa0",
  },
} as const;

export const s3Course: CourseConfig = {
  id: "s3",
  name: "Learn S3",
  service: "Amazon S3",
  basePath: "/s3",
  storageKey: "serverlesscreed:s3:progress:v1",
  certificates: { checkAnswerEndpoint: "/api/s3/check-answer" },
  regions: S3_REGIONS,
  regionOrder: ["Hoenn", "Sinnoh"],
  quests,
  guides: GUIDES,
  badgeId: (slug) => `s3-${slug}`,
  home: {
    headline: ["Archive the Pokédex.", "Master Amazon S3."],
    lede: "Store cards, sprites and battle replays in buckets, write real AWS SDK v3 code against a simulated S3, and earn a badge for each concept you master.",
    howItWorks: [
      { title: "Learn by exploring", body: "Interactive explorers show how prefixes, pages and lifecycle rules behave before you write a line." },
      { title: "Practice with real code", body: "Write AWS SDK v3 code. A simulated S3 parses it and answers with the response the real API would send." },
      { title: "Check and collect", body: "One question per quest. Get it right and the badge is yours." },
    ],
    whyOrder:
      "Every advanced S3 feature — presigned URLs, lifecycle rules, policies, events — is described in terms of buckets, keys and prefixes. Hoenn makes those second nature first, so Sinnoh can focus on production decisions.",
    whyGuide: "Normal",
    footer: "practice runs against a simulated S3 — no AWS account, no credentials, no signup.",
  },
};
