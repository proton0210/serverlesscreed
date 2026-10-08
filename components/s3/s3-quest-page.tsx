"use client";

import type { QuestContent, QuestMeta } from "@/lib/learn/types";
import type { S3Exercise } from "@/lib/s3/exercises";
import { LessonPage } from "@/components/learn/lesson/lesson-page";
import { S3CodeEditor } from "./s3-code-editor";
import { InlineCode } from "./inline-code";

/** An S3 quest: lesson, optional code challenge checked by /api/s3/simulate-quest, and the check. */
export function S3QuestPage({ meta, content, exercise }: { meta: QuestMeta; content: QuestContent; exercise?: S3Exercise }) {
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
          render: (onSuccess) => (
            <S3CodeEditor
              questId={meta.slug}
              problemCode={exercise.problemCode}
              solutionCode={exercise.solutionCode}
              goal={<InlineCode text={exercise.goal} />}
              onSuccess={onSuccess}
            />
          ),
        }
      }
    />
  );
}
