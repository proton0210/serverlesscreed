import { notFound } from "next/navigation";

import Quest3Page from "@/components/dynamodb/quest-3-page";
import { questContent } from "@/lib/dynamodb/quest-content";
import { getQuestMeta } from "@/lib/dynamodb/quests";
import { questMetadata } from "@/lib/dynamodb/quest-metadata";

export const metadata = questMetadata("quest-3");

export default function QuestThreePage() {
  const meta = getQuestMeta("quest-3");
  const content = questContent["quest-3"];

  if (!meta || !content) {
    notFound();
  }

  return <Quest3Page meta={meta} content={content} />;
}
