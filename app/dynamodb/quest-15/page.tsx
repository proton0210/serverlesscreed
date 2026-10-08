import { notFound } from "next/navigation";

import { JohtoQuestPage } from "@/components/dynamodb/johto-quest-page";
import { questContent } from "@/lib/dynamodb/quest-content";
import { johtoExercises } from "@/lib/dynamodb/johto-exercises";
import { getQuestMeta } from "@/lib/dynamodb/quests";
import { questMetadata } from "@/lib/dynamodb/quest-metadata";

export const metadata = questMetadata("quest-15");

export default function QuestFifteenPage() {
  const meta = getQuestMeta("quest-15");
  const content = questContent["quest-15"];
  const exercise = johtoExercises["quest-15"];

  if (!meta || !content || !exercise) {
    notFound();
  }

  return <JohtoQuestPage meta={meta} content={content} exercise={exercise} />;
}
