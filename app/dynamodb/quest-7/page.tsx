import { notFound } from "next/navigation";
import { Quest7Page } from "@/components/dynamodb/quest-7-page";
import { questContent } from "@/lib/dynamodb/quest-content";
import { getQuestMeta } from "@/lib/dynamodb/quests";
import { questMetadata } from "@/lib/dynamodb/quest-metadata";

export const metadata = questMetadata("quest-7");

export default function QuestSevenPage() {
  const meta = getQuestMeta("quest-7");
  const content = questContent["quest-7"];

  if (!meta || !content) {
    notFound();
  }

  return <Quest7Page meta={meta} content={content} />;
}
