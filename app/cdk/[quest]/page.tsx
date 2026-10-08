import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CdkQuestPage } from "@/components/cdk/cdk-quest-page";
import { availableQuests, getQuestMeta } from "@/lib/cdk/quests";
import { cdkQuestContent } from "@/lib/cdk/quest-content";
import { cdkExercises } from "@/lib/cdk/exercises";

type Params = { params: Promise<{ quest: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return availableQuests.map((q) => ({ quest: q.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { quest } = await params;
  const meta = getQuestMeta(quest);
  if (!meta) return {};
  const canonical = `/cdk/${meta.slug}`;
  return {
    title: meta.title,
    description: meta.subtitle,
    keywords: ["AWS CDK", "Cloud Development Kit", "infrastructure as code", ...meta.topics],
    alternates: { canonical },
    openGraph: { type: "article", title: `${meta.title} · ServerlessCreed`, description: meta.subtitle, url: canonical },
    twitter: { card: "summary_large_image", title: `${meta.title} · ServerlessCreed`, description: meta.subtitle },
  };
}

export default async function CdkQuest({ params }: Params) {
  const { quest } = await params;
  const meta = getQuestMeta(quest);
  const content = cdkQuestContent[quest];
  if (!meta || !content) notFound();
  return <CdkQuestPage meta={meta} content={content} exercise={cdkExercises[quest]} />;
}
