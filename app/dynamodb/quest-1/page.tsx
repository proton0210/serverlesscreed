import { notFound } from "next/navigation";

import QuestPage from "@/components/dynamodb/quest-page";
import { questContent } from "@/lib/dynamodb/quest-content";
import { getQuestMeta } from "@/lib/dynamodb/quests";
import { questMetadata } from "@/lib/dynamodb/quest-metadata";

export const metadata = questMetadata("quest-1");

export default function QuestOnePage() {
  const meta = getQuestMeta("quest-1");
  const content = questContent["quest-1"];

  if (!meta || !content) {
    notFound();
  }

  return <QuestPage meta={meta} content={content} />;
}
