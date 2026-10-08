"use client";

import type { QuestContent, QuestMeta } from "@/lib/learn/types";
import type { CdkExercise } from "@/lib/cdk/exercises";
import { LessonPage } from "@/components/learn/lesson/lesson-page";
import { CdkCodeEditor } from "./cdk-code-editor";
import { InlineCode } from "./inline-code";

/** A CDK quest: lesson, optional code challenge (TypeScript or Python) checked by /api/cdk/simulate-quest, and the check. */
export function CdkQuestPage({ meta, content, exercise }: { meta: QuestMeta; content: QuestContent; exercise?: CdkExercise }) {
  return (
    <LessonPage
      meta={meta}
      content={content}
      challenge={
        exercise && {
          brief: (
            <p>
              <InlineCode text={exercise.brief} />
            </p>
          ),
          render: (onSuccess) => <CdkCodeEditor key={meta.slug} questId={meta.slug} exercise={exercise} goal={<InlineCode text={exercise.goal} />} onSuccess={onSuccess} />,
        }
      }
    />
  );
}
