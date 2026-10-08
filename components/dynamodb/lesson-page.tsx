"use client";

import type { ComponentProps } from "react";
import { LessonPage as SharedLessonPage } from "@/components/learn/lesson/lesson-page";
import { PokedexModal } from "@/components/dynamodb/pokedex-modal";

export type { LessonChallenge } from "@/components/learn/lesson/lesson-page";

/** DynamoDB quests: the shared lesson layout, plus the Pokédex beside the start button on code quests. */
export function LessonPage({ showPokedex, ...props }: Omit<ComponentProps<typeof SharedLessonPage>, "heroAction"> & { showPokedex?: boolean }) {
  const pokedex = showPokedex ?? Boolean(props.challenge);
  return <SharedLessonPage {...props} heroAction={pokedex ? <PokedexModal /> : undefined} />;
}
