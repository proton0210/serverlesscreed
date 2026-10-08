import { COURSES, availableIn } from "@/lib/learn/courses";
import type { CourseId } from "@/lib/learn/types";

export type TierId =
  | "foundations"
  | "advanced"
  | "practitioner"
  | "s3-foundations"
  | "s3-advanced"
  | "s3-practitioner"
  | "cdk-foundations"
  | "cdk-advanced"
  | "cdk-practitioner";
export type StampKind = "code" | "check";

/** Quests without a code challenge, per course: the check alone completes them. */
const CHECK_ONLY: Record<CourseId, Set<string>> = {
  dynamodb: new Set(["quest-1", "quest-2"]),
  s3: new Set(["quest-12"]),
  cdk: new Set(),
};

export const COURSE_EDITION = "September 2026 edition";

export type Tier = {
  id: TierId;
  course: CourseId;
  title: string;
  short: string;
  /** The course part this tier covers, or null for the whole course. */
  region: string | null;
  blurb: string;
  /** Plain-text factual reference to the AWS service, per the AWS Trademark Guidelines ("[brand] for [AWS mark]"). */
  forService: string;
  /** Used in share text: "… quests on <shareTopics>". */
  shareTopics: string;
  hashtags: string;
};

const DYNAMO = { course: "dynamodb" as const, forService: "for Amazon DynamoDB", shareTopics: "keys, access patterns and production design", hashtags: "#DynamoDB #AWS #ServerlessCreed" };
const S3 = { course: "s3" as const, forService: "for Amazon S3", shareTopics: "buckets, uploads, lifecycle, security and events", hashtags: "#AmazonS3 #AWS #ServerlessCreed" };

const CDK = { course: "cdk" as const, forService: "for the AWS Cloud Development Kit (AWS CDK)", shareTopics: "constructs, stacks, grants, testing and environments", hashtags: "#AWSCDK #AWS #ServerlessCreed" };

export const TIERS: Record<TierId, Tier> = {
  foundations: {
    ...DYNAMO,
    id: "foundations",
    title: "Serverless Creed NoSQL Foundations",
    short: "NoSQL Foundations",
    region: "Kanto",
    blurb: "Keys and hashing, Scan and GetItem, conditional writes, updates, atomic counters and safe deletes.",
  },
  advanced: {
    ...DYNAMO,
    id: "advanced",
    title: "Serverless Creed NoSQL Advanced Patterns",
    short: "NoSQL Advanced Patterns",
    region: "Johto",
    blurb: "Expressions, secondary indexes, sort keys, transactions, batches, pagination, TTL and a production review.",
  },
  practitioner: {
    ...DYNAMO,
    id: "practitioner",
    title: "Serverless Creed NoSQL Practitioner",
    short: "NoSQL Practitioner",
    region: null,
    blurb: "The complete course: every foundation and advanced pattern, 17 quests.",
  },
  "s3-foundations": {
    ...S3,
    id: "s3-foundations",
    title: "Serverless Creed Object Storage Foundations",
    short: "Object Storage Foundations",
    region: "Hoenn",
    blurb: "Buckets and keys, uploads and reads, prefixes and pagination, storage classes, versioning and conditional writes.",
  },
  "s3-advanced": {
    ...S3,
    id: "s3-advanced",
    title: "Serverless Creed Object Storage Advanced Patterns",
    short: "Object Storage Advanced Patterns",
    region: "Sinnoh",
    blurb: "Presigned URLs, multipart uploads, lifecycle rules, bucket security and encryption, event notifications and a production review.",
  },
  "s3-practitioner": {
    ...S3,
    id: "s3-practitioner",
    title: "Serverless Creed Object Storage Practitioner",
    short: "Object Storage Practitioner",
    region: null,
    blurb: "The complete course: every foundation and advanced pattern, 12 quests.",
  },
  "cdk-foundations": {
    ...CDK,
    id: "cdk-foundations",
    title: "Serverless Creed Infrastructure as Code Foundations",
    short: "Infrastructure as Code Foundations",
    region: "Unova",
    blurb: "Apps, stacks and constructs, buckets and tables as code, Lambda functions, least-privilege grants and tokens.",
  },
  "cdk-advanced": {
    ...CDK,
    id: "cdk-advanced",
    title: "Serverless Creed Infrastructure as Code Production Patterns",
    short: "Infrastructure as Code Production Patterns",
    region: "Kalos",
    blurb: "APIs, event-driven wiring, dev and prod environments, tests with the assertions module, custom constructs and a launch review.",
  },
  "cdk-practitioner": {
    ...CDK,
    id: "cdk-practitioner",
    title: "Serverless Creed Infrastructure as Code Practitioner",
    short: "Infrastructure as Code Practitioner",
    region: null,
    blurb: "The complete course: every foundation and production pattern, 12 quests, in TypeScript or Python.",
  },
};

export const TIER_ORDER: TierId[] = [
  "foundations",
  "advanced",
  "practitioner",
  "s3-foundations",
  "s3-advanced",
  "s3-practitioner",
  "cdk-foundations",
  "cdk-advanced",
  "cdk-practitioner",
];

/** A course's certificates, part tiers first and the whole-course tier last. */
export const tiersFor = (course: CourseId) => TIER_ORDER.filter((t) => TIERS[t].course === course);

export const isTier = (v: unknown): v is TierId => typeof v === "string" && Object.prototype.hasOwnProperty.call(TIERS, v);

export function tierQuests(tier: TierId) {
  const { course, region } = TIERS[tier];
  return availableIn(COURSES[course]).filter((q) => region === null || q.region === region);
}

/** Region names whose badges a tier shows. */
export function tierRegions(tier: TierId) {
  const { course, region } = TIERS[tier];
  return region ? [region] : COURSES[course].regionOrder;
}

export const tierBadges = (tier: TierId) => tierRegions(tier).map((r) => COURSES[TIERS[tier].course].regions[r].badge);

/**
 * The quest id inside a stamp. DynamoDB keeps bare slugs (stamps issued before S3 existed stay valid);
 * other courses prefix theirs so "quest-1" of one course never counts for another.
 */
export const stampQuest = (course: CourseId, slug: string) => (course === "dynamodb" ? slug : `${course}:${slug}`);

export const stampKindsFor = (course: CourseId, slug: string): StampKind[] => (CHECK_ONLY[course].has(slug) ? ["check"] : ["code", "check"]);

/** Key of a stamp in a learner's progress and in the claim check, e.g. "s3:quest-4:code". */
export const stampKey = (quest: string, kind: StampKind) => `${quest}:${kind}`;

/** Every stamp key a tier needs. */
export function requiredStampKeys(tier: TierId) {
  const { course } = TIERS[tier];
  return tierQuests(tier).flatMap((q) => stampKindsFor(course, q.slug).map((k) => stampKey(stampQuest(course, q.slug), k)));
}

export type StampPayload = { v: 1; q: string; k: StampKind; l: string; t: number };

/** Reads a stamp's payload without verifying it (client display only; the server verifies). */
export function peekStamp(token: string): StampPayload | null {
  try {
    const [body] = token.split(".");
    const json = atob(body.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((body.length + 3) % 4));
    const p = JSON.parse(json) as StampPayload;
    return p && p.v === 1 && typeof p.q === "string" && (p.k === "code" || p.k === "check") ? p : null;
  } catch {
    return null;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CERT_ID_RE = /^SC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;
