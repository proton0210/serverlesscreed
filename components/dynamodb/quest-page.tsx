"use client";

import type { QuestMeta } from "@/lib/dynamodb/quests";
import type { QuestContent } from "@/lib/dynamodb/quest-content";
import { LessonPage } from "@/components/dynamodb/lesson-page";

/** Lesson + check quests (no code challenge). */
export function QuestPage({ meta, content }: { meta: QuestMeta; content: QuestContent }) {
  return <LessonPage meta={meta} content={content} />;
}

export default QuestPage;
