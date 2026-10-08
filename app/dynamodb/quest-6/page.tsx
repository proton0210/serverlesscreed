import { notFound } from "next/navigation";
import { Quest6Page } from "@/components/dynamodb/quest-6-page";
import { questContent } from "@/lib/dynamodb/quest-content";
import { getQuestMeta } from "@/lib/dynamodb/quests";
import { questMetadata } from "@/lib/dynamodb/quest-metadata";

export const metadata = questMetadata("quest-6");

export default function QuestSixPage() {
  const meta = getQuestMeta("quest-6");
  const content = questContent["quest-6"];

  if (!meta || !content) {
    notFound();
  }

  return <Quest6Page meta={meta} content={content} />;
}
