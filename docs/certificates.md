# Course certificates

Learners who finish a part of the course claim a verifiable certificate with a public page at
`/c/<id>` (for example `/c/SC-7K4Q-92MX`), a social preview image, a print/PDF layout and a
one-click LinkedIn **Add to profile** link. Plan: the "Course certificates — feature plan" Claude Doc.

## How completion is proven (no accounts)

1. The browser keeps a random learner id in each course's progress record (`components/learn/progress-provider.tsx`).
2. Every passing code challenge (`/api/dynamodb/simulate-quest`, `emulate-scan`, `emulate-get-item`, `/api/s3/simulate-quest`) and every
   right answer to a check (`/api/dynamodb/check-answer`, `/api/s3/check-answer`) returns a **stamp**: `{quest, kind, learnerId, time}`
   signed with HMAC-SHA256 (`lib/certificates/stamps.ts`). Check answers live only on the server
   (`lib/certificates/quiz-answers.ts`). S3 stamps name their quest `s3:quest-N`, so one course's stamps never
   count toward another's; DynamoDB keeps bare slugs so stamps issued before S3 existed stay valid.
3. `POST /api/certificates` verifies the stamps, requires every quest of the tier (code + check; check only for
   Quests 1–2) for the same learner id, then writes the certificate and the learner's claim in one
   `TransactWriteItems`, so claiming is idempotent.

| Certificate | Tier id | Quests |
| --- | --- | --- |
| Serverless Creed NoSQL Foundations — for Amazon DynamoDB | `foundations` | Part 1 (8) |
| Serverless Creed NoSQL Advanced Patterns — for Amazon DynamoDB | `advanced` | Part 2 (9) |
| Serverless Creed NoSQL Practitioner — for Amazon DynamoDB | `practitioner` | all 17 |
| Serverless Creed Object Storage Foundations — for Amazon S3 | `s3-foundations` | Part 1 (6) |
| Serverless Creed Object Storage Advanced Patterns — for Amazon S3 | `s3-advanced` | Part 2 (6; Quest 12 is check only) |
| Serverless Creed Object Storage Practitioner — for Amazon S3 | `s3-practitioner` | all 12 |

Tiers live in `lib/certificates/tiers.ts` (`TIERS`, `tiersFor(course)`); each names its course, part, service and share text.
A course opts in with `certificates: { checkAnswerEndpoint }` in its `CourseConfig`, which also turns on the shelf on its home page.

Names follow the AWS Trademark Guidelines ("[our brand] for [AWS mark]", no AWS logos, non-affiliation footer).

## Setup (production)

1. Deploy the table and policy: `infra/certificates-table.yaml` (command in the file header).
2. Give the app AWS access to the table: attach the output policy to the app's role, or create an IAM user with
   that policy and set `CERT_AWS_ACCESS_KEY_ID` / `CERT_AWS_SECRET_ACCESS_KEY` (hosts such as Vercel reserve `AWS_*`).
3. Set environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CERT_STAMP_SECRET` | yes | 32+ random bytes, e.g. `openssl rand -base64 32`. Signs stamps. |
| `CERT_STAMP_SECRET_PREVIOUS` | during rotation | Old secret, still accepted for verification. |
| `CERT_TABLE_NAME` | yes | `ServerlessCreedCertificates` |
| `CERT_TABLE_REGION` | no | Defaults to `AWS_REGION`, then `ap-south-1`. |
| `CERT_AWS_ACCESS_KEY_ID`, `CERT_AWS_SECRET_ACCESS_KEY` | when no role | Credentials for the policy above. |
| `NEXT_PUBLIC_SITE_URL` | no | Defaults to `https://serverlesscreed.com`; used in links and the certificate. |
| `NEXT_PUBLIC_LINKEDIN_ORG_ID` | no | Serverless Creed's LinkedIn company id. Puts the logo on learners' profiles. |
| `CERT_NAME_BLOCKLIST` | no | Extra comma-separated words refused in names. |

Without `CERT_STAMP_SECRET` and a table, production answers claims with 503 ("not switched on yet"); lessons
keep working. In development a JSON file store (`.data/certificates.json`, git-ignored) and a dev secret are used.

## Operations

- **Hide a certificate** (abuse report): set `cert.status` to `"hidden"` on item `PK = CERT#<id>, SK = META`.
  The page then returns 404.
- **Learner deletes**: the owner's browser holds a manage key (only its SHA-256 is stored); the certificate page
  shows "Delete certificate". Deleting removes the certificate and the claim, so the learner can claim again.
- **Rotate the secret**: move the current value to `CERT_STAMP_SECRET_PREVIOUS`, set a new `CERT_STAMP_SECRET`,
  and remove the previous one after a few weeks.
- **Analytics**: `certificate_claim`, `certificate_view`, `certificate_share{channel}`, `certificate_linkedin_add`.

## Learners who finished before certificates

Their progress has no stamps. The course home and claim dialog show "Re-check N quests", linking to each quest's
practice section; re-running the challenge and the check adds the stamps.
