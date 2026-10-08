## What this changes

<!-- One or two sentences. Link the issue: "Closes #123". -->

## Type

- [ ] Lesson fix (wording, accuracy, outdated AWS behaviour)
- [ ] Checker fix (correct answer rejected or wrong answer accepted)
- [ ] New quest
- [ ] Scene or interactive visual
- [ ] Engine, UI or tooling

## Accuracy

<!-- For any lesson or checker change: which AWS documentation pages did you check? -->

-

## Checklist

- [ ] `npm run lint` and `npx tsc --noEmit` pass
- [ ] `npm run test:dynamodb:sdk` and `npm run test:cdk:unit` pass
- [ ] Contract tests pass for the course I changed (`test:dynamodb` / `test:s3` / `test:cdk`)
- [ ] Every starter still fails and every reference solution still passes
- [ ] New quests: quiz answer added to `lib/certificates/quiz-answers.ts`, and not revealed in the lesson
- [ ] No real AWS account IDs, ARNs, endpoints or credentials (examples use `111122223333`)
- [ ] No official Pokémon artwork, sprites or models
- [ ] Commits are signed off (`git commit -s`)

## Screenshots

<!-- For any visible change: before and after. -->
