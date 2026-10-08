import Link from "next/link";
import type { CourseId } from "@/lib/learn/types";
import { COURSES } from "@/lib/learn/courses";
import { CourseProvider } from "./course-context";
import { ProgressProvider } from "./progress-provider";
import { LearningProgress } from "./learning-progress";
import { AnalyticsScript } from "./analytics-script";
import { Logo } from "@/components/brand/logo";

/** Header, progress menu and footer shared by every course (/dynamodb, /s3, /cdk). */
export function CourseShell({ courseId, children }: { courseId: CourseId; children: React.ReactNode }) {
  const course = COURSES[courseId];
  return (
    <CourseProvider courseId={courseId}>
      <ProgressProvider>
        <AnalyticsScript />
        <div className="sc-app min-h-screen">
          <a href="#learning-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
            Skip to content
          </a>
          <header className="sticky top-0 z-40 border-b border-[var(--sc-line)]/80 bg-[var(--sc-paper)]/[.92] backdrop-blur-xl backdrop-saturate-150">
            <nav aria-label="Learning navigation" className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-8">
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center text-[var(--sc-ink)]" aria-label="Serverless Creed home">
                  <Logo markClassName="h-6 w-auto" wordmarkClassName="hidden text-[15px] sm:inline" />
                </Link>
                <span aria-hidden className="hidden h-5 w-px bg-[var(--sc-line)] sm:block" />
                <Link href={course.basePath} className="rounded-full px-2.5 py-1.5 text-[13.5px] font-semibold text-[var(--sc-ink)] transition hover:bg-black/[.04]">
                  {course.name}
                </Link>
              </div>
              <LearningProgress />
            </nav>
          </header>
          <div id="learning-content">{children}</div>
          <footer className="mt-10 border-t border-[var(--sc-line)]">
            <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-10 text-[13px] text-[var(--sc-ink-3)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p>
                <span className="font-semibold text-[var(--sc-ink)]">{course.name}</span> · {course.home.footer}
              </p>
              <div className="flex gap-5">
                {Object.values(COURSES)
                  .filter((c) => c.id !== course.id)
                  .map((c) => (
                    <Link key={c.id} href={c.basePath} className="font-medium text-[var(--sc-ink-2)] underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  ))}
                <Link href="/" className="font-medium text-[var(--sc-ink-2)] underline-offset-4 hover:underline">
                  Built by Serverless Creed
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </ProgressProvider>
    </CourseProvider>
  );
}
