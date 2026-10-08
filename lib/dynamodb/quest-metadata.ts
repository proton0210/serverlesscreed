import type { Metadata } from "next";
import { getQuestMeta } from "@/lib/dynamodb/quests";

// Builds per-quest SEO metadata from the quest registry so each /dynamodb/<slug>
// route gets its own optimized title, description, canonical, and OG tags.
export function questMetadata(slug: string): Metadata {
  const meta = getQuestMeta(slug);
  if (!meta) return {};

  const canonical = `/dynamodb/${meta.slug}`;
  const description = meta.subtitle;
  const keywords = ["DynamoDB", "AWS SDK v3", ...meta.topics];

  return {
    title: meta.title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: `${meta.title} · ServerlessCreed`,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: `${meta.title} · ServerlessCreed`,
      description,
    },
  };
}
