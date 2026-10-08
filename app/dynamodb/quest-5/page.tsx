import { notFound } from "next/navigation";
import { Quest5Page } from "@/components/dynamodb/quest-5-page";
import { questContent } from "@/lib/dynamodb/quest-content";
import { getQuestMeta } from "@/lib/dynamodb/quests";
import { questMetadata } from "@/lib/dynamodb/quest-metadata";

export const metadata = questMetadata("quest-5");

export default function QuestFivePage() {
  const meta = getQuestMeta("quest-5");
  const content = questContent["quest-5"];

  if (!meta || !content) {
    notFound();
  }

  return <Quest5Page meta={meta} content={content} />;
}
