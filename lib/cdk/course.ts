import type { CourseConfig } from "@/lib/learn/types";
import { quests } from "./quests";

/** Each quest is hosted by one Data Critter (components/dynamodb/scene/critter-svg.tsx). */
const GUIDES: Record<string, string> = {
  "quest-1": "Psychic",
  "quest-2": "Normal",
  "quest-3": "Rock",
  "quest-4": "Electric",
  "quest-5": "Water",
  "quest-6": "Flying",
  "quest-7": "Fire",
  "quest-8": "Grass",
  "quest-9": "Rock",
  "quest-10": "Psychic",
  "quest-11": "Electric",
  "quest-12": "Normal",
};

export const CDK_REGIONS = {
  Unova: {
    part: "Part 1",
    title: "Foundations",
    blurb: "Apps, stacks and constructs; buckets, tables and functions as code; least-privilege grants; and the tokens that tie them together.",
    badge: "/cdk/badges/unova-badge.svg",
    color: "var(--sc-unova)",
    ink: "#1f4f9e",
  },
  Kalos: {
    part: "Part 2",
    title: "Production patterns",
    blurb: "APIs and events, one stack per environment, tests on the synthesized template, your own constructs — and a launch review to finish.",
    badge: "/cdk/badges/kalos-badge.svg",
    color: "var(--sc-kalos)",
    ink: "#a3305a",
  },
} as const;

export const cdkCourse: CourseConfig = {
  id: "cdk",
  name: "Learn CDK",
  service: "AWS CDK",
  basePath: "/cdk",
  storageKey: "serverlesscreed:cdk:progress:v1",
  certificates: { checkAnswerEndpoint: "/api/cdk/check-answer" },
  regions: CDK_REGIONS,
  regionOrder: ["Unova", "Kalos"],
  quests,
  guides: GUIDES,
  badgeId: (slug) => `cdk-${slug}`,
  home: {
    headline: ["Stop clicking.", "Start shipping with the AWS CDK."],
    lede: "Describe the Pokédex backend in TypeScript or Python, run it through a simulated cdk synth, and see the CloudFormation your code produces. You write TypeScript or Python and have used the AWS console; no AWS account or CDK install needed. Earn a badge for every concept you master.",
    howItWorks: [
      { title: "Learn by building", body: "Each quest adds one piece of the Pokédex backend, from a bucket to a tested, multi-environment stack." },
      { title: "Write real CDK", body: "Use TypeScript or Python. A simulator reads your code, checks it the way CDK would, and shows the template it synthesizes." },
      { title: "Check and collect", body: "One question per quest. Get it right and the badge is yours." },
    ],
    whyOrder:
      "Every CDK app is a tree of constructs, and every real-world problem — permissions, environments, tests — is solved by understanding that tree. Unova makes the tree second nature first, so Kalos can focus on production decisions.",
    whyGuide: "Psychic",
    footer: "practice runs against a simulated cdk synth — no AWS account, no credentials, nothing is deployed. The simulator models the constructs used in this course; other code may not be recognised.",
  },
};
