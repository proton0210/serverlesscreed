# Learn CDK

12 quests (Unova 1–6, Kalos 7–12) at `/cdk`, in TypeScript or Python, on the shared learn engine.

## How practice code is checked
Nothing submitted is executed. `lib/cdk/checker.ts` parses the code (`parse-ts.ts` uses the TypeScript compiler's parser, `parse-py.ts` is a small Python-subset parser), both produce one IR, `interp.ts` runs it against plain-value models of the CDK constructs, and `synth.ts` emits a CloudFormation template (real logical IDs, grants, tokens as `Ref`/`Fn::GetAtt`/`Fn::Join`). Each quest's rule in `checker.ts` then judges the result.

Limits: only the constructs used in the course are modelled. Loops over lists and `range()` (with `break`/`continue`), helper methods on stack and construct classes, `forEach`/`map` and simple Python formatting run; comprehensions, `enumerate`, `.items()` and similar are skipped with a note. Values are size-bounded so a crafted request cannot blow up memory. Input is capped at 20,000 characters, nesting depth and step counts are bounded.

## Keeping it current
`lib/cdk/catalog.ts` holds the Lambda runtime lists and property specs (`CATALOG_AS_OF`). Review it when Lambda deprecates a runtime or CDK deprecates a prop; the lessons mention current runtimes in quest 4.

## Tests
- `npm run test:cdk:unit` — every starter fails and every solution passes in both languages; regressions from the audits.
- `npm run test:cdk` — contract test against a running server (pages, API, certificates, course isolation).

Quiz answers live in `lib/certificates/quiz-answers.ts` (`CDK_QUIZ_ANSWERS`) and are graded by `/api/cdk/check-answer`.
