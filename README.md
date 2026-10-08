# Serverless Creed

**Learn AWS by doing.** Free, hands-on courses for Amazon DynamoDB, Amazon S3 and the AWS CDK. Learners write real AWS SDK v3 and CDK code (TypeScript or Python) against a simulated service, watch every request play out, and earn a certificate anyone can verify.

Live at **[serverlesscreed.com](https://serverlesscreed.com)**. No signup, no AWS account, no credit card.

| Course | Quests | Parts |
| --- | --- | --- |
| [Learn DynamoDB](https://serverlesscreed.com/dynamodb) | 17 | Kanto (foundations), Johto (advanced patterns) |
| [Learn S3](https://serverlesscreed.com/s3) | 12 | Hoenn (foundations), Sinnoh (advanced patterns) |
| [Learn CDK](https://serverlesscreed.com/cdk) | 12 | Unova (foundations), Kalos (production patterns) |

## How a quest works

1. **Learn by watching.** Animated scenes show each request travel to its partition or prefix, and what breaks without the right pattern.
2. **Practice with real code.** The learner's code is **parsed, never executed**. A simulator evaluates the SDK or CDK calls and answers the way the real service would.
3. **Check and collect.** One question per quest. Passing challenges and checks earn signed stamps, which add up to certificates.

## Run it locally

Requires **Node.js 22.18 or later**. The test scripts import TypeScript files directly.

```bash
npm ci
npm run dev            # http://localhost:3000
```

Nothing else is needed. In development, certificates use a git-ignored JSON file store and a built-in dev secret. Analytics stay off unless `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set (see `.env.example`).

### Tests

Unit-style checks run on their own:

```bash
npm run lint
npm run test:dynamodb:sdk   # type-checks every DynamoDB SDK example, no AWS calls
npm run test:cdk:unit       # every CDK starter fails and every solution passes, TS and Python
```

The contract tests run against a production build. Give each suite a **fresh server**, because the certificate endpoint is rate-limited per IP:

```bash
npm run build
CERT_STORE=file CERT_STAMP_SECRET=local-test-secret npx next start -p 3100 &
npm run test:dynamodb       # or test:s3 / test:cdk, one per server start
```

CI runs all of this on every pull request (`.github/workflows/ci.yml`).

## Project layout

```
app/                    Next.js routes: course homes, quest pages, /api checkers, /c/<id> certificates
components/learn/       Shared learning engine: lesson page, workbench, quiz, progress, badges
components/<course>/    Course-specific editors, scenes and interactive visuals
lib/learn/              Course types and registry (CourseConfig, QuestMeta, QuestContent)
lib/<course>/           Quest list, lesson content, exercises and the checker/simulator for each course
lib/certificates/       Stamps (HMAC), tiers, quiz answers, certificate store
scripts/                Test suites and the AWS icon importer
docs/                   Architecture notes for each course, scenes and certificates
infra/                  CloudFormation for the certificates table
```

Deeper reading: [`docs/s3-course.md`](docs/s3-course.md) (shared engine), [`docs/dynamodb-scenes.md`](docs/dynamodb-scenes.md), [`docs/cdk-course.md`](docs/cdk-course.md), [`docs/certificates.md`](docs/certificates.md).

## Contributing

New quests, lesson fixes, better explanations, translations of tricky concepts into clearer ones: all welcome. Start with **[CONTRIBUTING.md](CONTRIBUTING.md)**, then [docs/authoring/writing-a-quest.md](docs/authoring/writing-a-quest.md).

Want a course on another AWS service? [Open a course proposal](../../issues/new/choose). The next course is picked by the people who ask for it.

## Licence and trademarks

Code and lesson text are released under the [MIT Licence](LICENSE). The Serverless Creed name, logo, Data Critter characters, badge artwork and founder photo are **not** covered by that licence; see [TRADEMARKS.md](TRADEMARKS.md).

Amazon Web Services, AWS, Amazon DynamoDB, Amazon S3 and AWS CDK are trademarks of Amazon.com, Inc. or its affiliates. Pokémon names are used for teaching only. Serverless Creed is not affiliated with AWS, Nintendo, Creatures or GAME FREAK.
