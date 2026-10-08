import { notFound } from "next/navigation";
import { Quest8Page } from "@/components/dynamodb/quest-8-page";
import { questContent } from "@/lib/dynamodb/quest-content";
import { getQuestMeta } from "@/lib/dynamodb/quests";
import { questMetadata } from "@/lib/dynamodb/quest-metadata";

export const metadata = questMetadata("quest-8");

export default function QuestEightPage() {
  const meta = getQuestMeta("quest-8");
  const content = questContent["quest-8"];

  if (!meta || !content) {
    notFound();
  }

  return <Quest8Page meta={meta} content={content} />;
}
