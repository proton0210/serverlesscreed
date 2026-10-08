import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { S3QuestPage } from "@/components/s3/s3-quest-page";
import { availableQuests, getQuestMeta } from "@/lib/s3/quests";
import { s3QuestContent } from "@/lib/s3/quest-content";
import { s3Exercises } from "@/lib/s3/exercises";

type Params = { params: Promise<{ quest: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return availableQuests.map((q) => ({ quest: q.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { quest } = await params;
  const meta = getQuestMeta(quest);
  if (!meta) return {};
  const canonical = `/s3/${meta.slug}`;
  return {
    title: meta.title,
    description: meta.subtitle,
    keywords: ["Amazon S3", "AWS SDK v3", ...meta.topics],
    alternates: { canonical },
    openGraph: { type: "article", title: `${meta.title} · ServerlessCreed`, description: meta.subtitle, url: canonical },
    twitter: { card: "summary_large_image", title: `${meta.title} · ServerlessCreed`, description: meta.subtitle },
  };
}

export default async function S3Quest({ params }: Params) {
  const { quest } = await params;
  const meta = getQuestMeta(quest);
  const content = s3QuestContent[quest];
  if (!meta || !content) notFound();
  return <S3QuestPage meta={meta} content={content} exercise={s3Exercises[quest]} />;
}
