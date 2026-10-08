# Public DynamoDB tutorials

The Dynomaster DynamoDB curriculum now lives in this site at `/dynamodb`.
All 17 lessons retain their original `quest-*` slugs under that path.
The home navigation links to the course. Lesson metadata uses the new
`https://serverlesscreed.com/dynamodb` canonical URLs.

## Experience

- Pokémon-themed lessons, code challenges, reference solutions, quizzes, and badges.
- Open access: no authentication, AWS account, or credentials.
- Progress and badges are saved in localStorage under
  `serverlesscreed:dynamodb:progress:v1`. Storage failures do not block learning.
- The badges menu allows the learner to reset this course's local progress.
- Previous progress on another domain cannot transfer automatically because
  browser storage is origin-specific.

## Implementation

- Routes: `app/dynamodb/`
- Components: `components/dynamodb/`
- Curriculum and fixtures: `lib/dynamodb/`
- Simulator APIs: `app/api/dynamodb/`
- Badge artwork: `public/dynamodb/badges/`

Simulators parse JavaScript and validate expected exercise patterns. They do not
execute submitted code or make AWS calls. Feedback is an instructional simulation,
not validation of arbitrary production DynamoDB programs. Monaco loads its editor
runtime through its default CDN loader.

The migration does not include AppSync, the product console, or source-site
redirects. The original Dynomaster repository is unchanged.

## Verify and preview

```sh
npm install
npm run build
npm run start -- -p 3100
# In another terminal:
npm run test:dynamodb
```

Open `http://localhost:3100/dynamodb`. The smoke check verifies every lesson's
public response and canonical, rejects old quest links, checks Scan/GetItem and
invalid simulator input, and validates all nine advanced reference solutions.
Use `TEST_ORIGIN` to test a different local server.

Browser checks completed: initial course navigation, successful quiz and badge,
badge persistence after reload, advanced code editing and successful simulation,
reference solution tab, and mobile lesson layout at 390px.

Deploy with the existing ServerlessCreed site pipeline when ready. No AWS secrets
or authentication configuration is required for these tutorials.

## Curriculum and SDK review — 2026-09-15

Checked against current official AWS documentation; links and the review date
are maintained internally in `lib/dynamodb/curriculum-review.ts`.
The npm registry reported `3.1132.0` for both `@aws-sdk/client-dynamodb` and
`@aws-sdk/lib-dynamodb`. Both are pinned as **development-only** dependencies for
verification; the public learning app still simulates operations without AWS.

Changes from the imported curriculum:

- Document commands consistently use `DynamoDBDocumentClient`; standalone code
  examples include their imports and setup. Clarified v3 undefined-value handling.
- Aliased reserved `Name` and `Level` attributes in expressions, and updated the
  simulator to require those bindings instead of accepting invalid AWS examples.
- Added MREC/MRSC differences and MRSC's current TTL/transaction restrictions.
  The production exercise explicitly selects MREC for its stated requirements.
- Clarified transaction size/scope/idempotency, BatchGet size/partial results,
  pagination termination, scan snapshot limitations, atomic-counter retries,
  asynchronous TTL cleanup, and configurable PITR retention.
- Added bounded exponential backoff with jitter to both batch exercise variants.

Run `npm run test:dynamodb:sdk` to type-check all 30 complete SDK examples against
installed SDK declarations and exercise actual document-client serialization with
an in-memory transport. It makes no AWS calls. `npm run test:dynamodb` checks
lesson routes, reference solutions, and reserved-word/consistency regressions
against the local production server. Dependency version pins and the internal
review record should change together after a future review.
