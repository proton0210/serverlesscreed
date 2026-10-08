import type { CourseConfig, CourseId, QuestMeta } from "./types";
import { dynamodbCourse } from "@/lib/dynamodb/course";
import { s3Course } from "@/lib/s3/course";
import { cdkCourse } from "@/lib/cdk/course";

export const COURSES: Record<CourseId, CourseConfig> = {
  dynamodb: dynamodbCourse,
  s3: s3Course,
  cdk: cdkCourse,
};

export const availableIn = (course: CourseConfig) => course.quests.filter((q) => q.status === "available");

export const guideIn = (course: CourseConfig, slug: string) => course.guides[slug] ?? "Psychic";

export function numberIn(course: CourseConfig, slug: string) {
  const i = availableIn(course).findIndex((q) => q.slug === slug);
  return i < 0 ? "" : String(i + 1).padStart(2, "0");
}

export function neighboursIn(course: CourseConfig, slug: string): { prev: QuestMeta | null; next: QuestMeta | null } {
  const list = availableIn(course);
  const i = list.findIndex((q) => q.slug === slug);
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
  };
}

/** True when this quest is the final lesson of its region. */
export function closesRegionIn(course: CourseConfig, meta: QuestMeta) {
  const region = availableIn(course).filter((q) => q.region === meta.region);
  return region[region.length - 1]?.slug === meta.slug;
}

export const questHref = (course: CourseConfig, slug: string) => `${course.basePath}/${slug}`;

export const minutes = (duration: string) => parseInt(duration, 10) || 0;
