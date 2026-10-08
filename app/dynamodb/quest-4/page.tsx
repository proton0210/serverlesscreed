import { notFound } from "next/navigation";

import Quest4Page from "@/components/dynamodb/quest-4-page";
import { questContent } from "@/lib/dynamodb/quest-content";
import { getQuestMeta } from "@/lib/dynamodb/quests";
import { questMetadata } from "@/lib/dynamodb/quest-metadata";

export const metadata = questMetadata("quest-4");

export default function QuestFourPage() {
  const meta = getQuestMeta("quest-4");
  const content = questContent["quest-4"];

  if (!meta || !content) {
    notFound();
  }

  return <Quest4Page meta={meta} content={content} />;
}
