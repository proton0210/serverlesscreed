# Learn S3 (`/s3`)

Twelve Pokémon-themed quests on Amazon S3, built on the same learning engine as Learn DynamoDB.
Plan, PRD and backlog: "Learn S3 — Plan, PRD & Backlog" Claude Doc.

## Shared learning engine

Both courses render the same components; everything course-specific comes from a `CourseConfig`.

| Piece | File | Role |
| --- | --- | --- |
| Types | `lib/learn/types.ts` | `CourseConfig`, `QuestMeta`, `QuestSection`, `QuestContent`, `Region` |
| Registry + helpers | `lib/learn/courses.ts` | `COURSES`, `availableIn`, `numberIn`, `neighboursIn`, `closesRegionIn`, `questHref` |
| Course configs | `lib/dynamodb/course.ts` (`dynamodbCourse`), `lib/s3/course.ts` (`s3Course`) | Paths, regions, guides, badge ids, storage key, home-page copy |
| Context | `components/learn/course-context.tsx` | `CourseProvider courseId`, `useCourse()`; tags analytics events with `course` |
| Shell | `components/learn/course-shell.tsx` | Header, progress menu, footer (used by both layouts) |
| Progress | `components/learn/progress-provider.tsx` | localStorage `serverlesscreed:<course>:progress:v1` (DynamoDB key unchanged) |
| Lesson UI | `components/learn/lesson/*` | LessonPage, sections, Workbench, CodeInput, QuizCard, BadgeDialog |
| Course home | `components/learn/course-dashboard.tsx` | Hero, how it works, regions |

`components/dynamodb/lesson-page.tsx` wraps the shared LessonPage and adds the Pokédex button
(`heroAction`). Data Critters still live in `components/dynamodb/scene/critter-svg.tsx` and are used by both courses.

## S3 course

| Piece | File |
| --- | --- |
| Quest list (Hoenn = Part 1, Sinnoh = Part 2) | `lib/s3/quests.ts` |
| Lessons and quizzes | `lib/s3/quest-content.tsx` |
| Practice tasks (plain strings) | `lib/s3/exercises.ts` |
| Checker | `lib/s3/checker.ts` → `POST /api/s3/simulate-quest` |
| Editor + page | `components/s3/s3-code-editor.tsx`, `components/s3/s3-quest-page.tsx` |
| Interactive visuals | `components/s3/prefix-explorer.tsx` (Quest 4), `components/s3/lifecycle-timeline.tsx` (Quest 9) |
| Routes | `app/s3/layout.tsx`, `app/s3/page.tsx`, `app/s3/[quest]/page.tsx` (static params, per-quest metadata) |
| Badges | `public/s3/badges/hoenn-badge.svg`, `sinnoh-badge.svg` (original artwork) |

The checker never runs learner code. acorn parses it, the literal arguments of `new XCommand({...})`
(and `getSignedUrl`, `new Upload`) are evaluated — including `const` references, arithmetic, template
strings and `JSON.stringify` — and per-quest rules return either the S3 error the real API would send
(`NoSuchKey`, `InvalidBucketName`, `EntityTooSmall`, …) or a simulated response. The credential scan
(`/api/learn/scan-code`) runs first, as in DynamoDB.

`checker.ts` and `exercises.ts` must stay free of `@/` imports and JSX: the test imports them directly.

## Certificates

Three certificates — Object Storage Foundations, Advanced Patterns and Practitioner, "for Amazon S3" — use the shared
system in `docs/certificates.md`. Checks are graded by `/api/s3/check-answer` (answers in `lib/certificates/quiz-answers.ts`,
not in the lesson content), and passing checks and challenges return stamps. When adding a quest, add its answer there too.

## Adding a quest

1. Add it to `lib/s3/quests.ts` and pick a guide in `lib/s3/course.ts`.
2. Write the lesson and quiz in `lib/s3/quest-content.tsx`.
3. Optional practice: add a task to `lib/s3/exercises.ts` and a rule to `checks` in `lib/s3/checker.ts`.
4. Update the counts in `scripts/check-s3.mjs`.

## Tests

`npm run test:s3` (Node 22.18+, against a running server; `TEST_ORIGIN` defaults to
`http://localhost:3100`): every page returns 200 with its canonical URL, every starter fails, every
solution passes, key failure lessons return the right error, and the three certificates can be claimed
(the server needs `CERT_STAMP_SECRET` and `CERT_STORE=file` when run with `next start`).
