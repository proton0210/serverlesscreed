"use client";

import type { QuestMeta } from "@/lib/dynamodb/quests";
import type { QuestContent } from "@/lib/dynamodb/quest-content";
import type { JohtoExercise } from "@/lib/dynamodb/johto-exercises";
import { LessonPage } from "@/components/dynamodb/lesson-page";
import { SimulateCodeEditor } from "@/components/dynamodb/simulate-code-editor";

/**
 * Johto (advanced) quests: lesson, a code challenge validated by
 * /api/dynamodb/simulate-quest, and a check. The badge needs both.
 */
export function JohtoQuestPage({ meta, content, exercise }: { meta: QuestMeta; content: QuestContent; exercise: JohtoExercise }) {
  return (
    <LessonPage
      meta={meta}
      content={content}
      challenge={{
        brief: exercise.challengeDescription,
        render: (onSuccess) => (
          <SimulateCodeEditor
            questId={meta.slug}
            problemCode={exercise.problemCode}
            solutionCode={exercise.solutionCode}
            goalHint={exercise.goalHint}
            onSuccess={onSuccess}
          />
        ),
      }}
    />
  );
}

export default JohtoQuestPage;
