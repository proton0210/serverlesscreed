"use client";

import { createContext, useContext } from "react";
import { COURSES } from "@/lib/learn/courses";
import type { CourseConfig, CourseId } from "@/lib/learn/types";
import { setGlobalAnalyticsProps } from "@/lib/analytics";

const CourseContext = createContext<CourseConfig>(COURSES.dynamodb);

/** Selects the course every learning component below renders for. */
export function CourseProvider({ courseId, children }: { courseId: CourseId; children: React.ReactNode }) {
  const course = COURSES[courseId];
  // Set during render so children's first events (quest_view) already carry the course.
  setGlobalAnalyticsProps({ course: course.id });
  return <CourseContext.Provider value={course}>{children}</CourseContext.Provider>;
}

export const useCourse = () => useContext(CourseContext);
