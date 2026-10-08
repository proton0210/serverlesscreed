# Contributing to Serverless Creed

Thanks for helping people learn AWS by doing. This guide covers what we're looking for, how to set up, and what a pull request needs before it can merge.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## What you can contribute

| Contribution | Size | Start with |
| --- | --- | --- |
| **Fix a lesson:** typo, unclear sentence, outdated AWS behaviour, wrong limit | Small | Open a PR directly |
| **Improve a checker:** a correct answer is rejected, or a wrong one passes | Small to medium | Open a PR with a failing test case |
| **Add a quest** to an existing course | Medium | [Quest proposal issue](../../issues/new?template=quest-proposal.yml), then a PR |
| **Add a scene or interactive visual** | Medium to large | Issue first |
| **Propose a new course** (another AWS service) | Large | [Course proposal issue](../../issues/new?template=course-proposal.yml). Please don't start coding until it's agreed. |
| **Report a bug** | — | [Bug report](../../issues/new?template=bug-report.yml) |

For anything larger than a fix, **open an issue first** so we can agree on the concept, the quest's place in the course and the checker approach before you spend an evening on it.

## Setup

You need **Node.js 22.18+** and npm.

```bash
git clone https://github.com/<your-fork>/serverlesscreed.git
cd serverlesscreed
npm ci
npm run dev
```

The app needs no AWS account, credentials or environment variables to run. **Never add real AWS credentials, account IDs or endpoints to the repo**, not even in examples. Use the documented example account `111122223333` and the region `ap-south-1`.

## How the code is organised

Every course runs on one shared learning engine. A course provides a `CourseConfig` (`lib/<course>/course.ts`), a list of quests (`lib/<course>/quests.ts`), lesson content (`lib/<course>/quest-content.tsx`), practice exercises (`lib/<course>/exercises.ts` or `johto-exercises.tsx`) and a checker that judges submitted code.

**Learner code is never executed.** It is parsed (acorn for SDK code, the TypeScript parser or a Python-subset parser for CDK). The checker evaluates the literal arguments and replies with what the real service would return, including its real error codes. Keep it that way. A PR that runs submitted code (`eval`, `Function`, `vm`, a child process) will not be merged.

Architecture notes: [shared engine and S3](docs/s3-course.md), [DynamoDB scenes](docs/dynamodb-scenes.md), [CDK checker](docs/cdk-course.md), [certificates](docs/certificates.md).

## Adding a quest

Read **[docs/authoring/writing-a-quest.md](docs/authoring/writing-a-quest.md)** first. It has the lesson blueprint, the voice and the quality bar. Then:

### Learn S3 (`/s3`)

1. Add the quest to `lib/s3/quests.ts` and pick its guide in `lib/s3/course.ts` (`GUIDES`).
2. Write the lesson and quiz in `lib/s3/quest-content.tsx`.
3. Practice: add a task to `lib/s3/exercises.ts` and a rule to `checks` in `lib/s3/checker.ts`.
4. Add the quiz answer to `S3_QUIZ_ANSWERS` in `lib/certificates/quiz-answers.ts`.
5. If the quest belongs to a certificate part, update the tier in `lib/certificates/tiers.ts`.
6. Update the counts in `scripts/check-s3.mjs`.

`checker.ts` and `exercises.ts` must stay free of `@/` imports and JSX, because the tests import them directly.

### Learn CDK (`/cdk`)

1. Add the quest to `lib/cdk/quests.ts` and its lesson to `lib/cdk/content/part*.tsx`.
2. Add starter and solution code **in both TypeScript and Python** to `lib/cdk/exercises.ts`.
3. Add a rule in `lib/cdk/checker.ts`. If you need a construct that isn't modelled, add it to `lib/cdk/model.ts` and `lib/cdk/catalog.ts`.
4. Add the quiz answer to `CDK_QUIZ_ANSWERS` in `lib/certificates/quiz-answers.ts`.
5. Add regression cases to `scripts/check-cdk-unit.mjs`.

### Learn DynamoDB (`/dynamodb`)

DynamoDB quests have one route each.

1. Add the quest to `lib/dynamodb/quests.ts` (region `Kanto` or `Johto`).
2. Add the lesson to `lib/dynamodb/quest-content.tsx` and the exercise to `lib/dynamodb/johto-exercises.tsx`.
3. Create `app/dynamodb/<slug>/page.tsx`, copying an existing Johto quest page.
4. Add the quiz answer to `QUIZ_ANSWERS` in `lib/certificates/quiz-answers.ts`.
5. Optional scene: follow "Adding a scene to a quest" in [docs/dynamodb-scenes.md](docs/dynamodb-scenes.md).
6. Add success and failure cases to `scripts/check-dynamodb.mjs`. If the quest has full SDK examples, they are type-checked by `test:dynamodb:sdk` automatically.

> **Quiz answers.** The site grades checks on the server so the answer isn't in the page bundle. In this public repo the answers are readable, which is fine: certificates prove that someone worked through the quests, not that they passed a proctored exam. Don't put the answer in the lesson's quiz text or in a code comment.

## Quality bar for lesson content

- **Accurate against current AWS documentation.** Link the doc page you checked in the PR description. Limits, defaults and pricing units (RCU, WCU, request classes) must match it.
- **Current SDKs only:** AWS SDK for JavaScript **v3** (`@aws-sdk/*`), CDK **v2** (`aws-cdk-lib`). No v2 SDK, no deprecated runtimes.
- **One concept per quest**, 12–25 minutes. If it needs more, it's two quests.
- **Every starter must fail and every reference solution must pass.** The tests enforce this.
- **Teach the failure.** Show what goes wrong without the pattern (the throttled scan, the overwritten item, the infinite S3 trigger loop) before the fix.
- **Pokémon theme:** use Pokémon *names* and Pokédex facts only. No official artwork, sprites, logos or models. The cast on screen is the original Data Critters.

## Before you open a pull request

```bash
npm run lint
npx tsc --noEmit
npm run test:dynamodb:sdk
npm run test:cdk:unit
npm run build
# then, against a fresh `next start -p 3100` for each:
npm run test:dynamodb && npm run test:s3 && npm run test:cdk
```

Then:

- Fill in the pull request template, including the AWS docs you checked and screenshots of any UI change.
- Keep PRs focused: one quest or one fix per PR.
- Sign off your commits (`git commit -s`). This certifies the [Developer Certificate of Origin](https://developercertificate.org/): you wrote the change, or have the right to submit it under the project licence.
- Don't commit `.env` files, `.data/`, screenshots of your own AWS console, or generated build output.

## Review and merge

A maintainer reviews for technical accuracy first, then teaching quality, then code. Expect questions about edge cases. Lessons are only as good as their worst sentence. Once merged, your change ships to serverlesscreed.com with the next deploy.

## Questions

Ask in a GitHub Discussion or on the issue you're working from. For anything security-related, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
