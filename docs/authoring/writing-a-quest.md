# Writing a quest

A quest is about 15 minutes of doing, not watching. It teaches **one** AWS concept through a small Pokédex problem, makes the learner write the real API call, and ends with one question. This page is the blueprint. Copy the template at the bottom into your quest proposal issue.

## The shape of every quest

| Part | What it does | Where it lives |
| --- | --- | --- |
| **Meta** | Title, one-line subtitle, 2–3 topics, difficulty, duration | `lib/<course>/quests.ts` |
| **Intro** | The Pokédex problem in 2–3 sentences, ending on why it matters | `quest-content` → `intro` |
| **Key takeaways** | 2–4 bullets the learner should be able to repeat afterwards | `keyTakeaways` |
| **Sections** | 2–4 short sections. Usually: the concept → what goes wrong → the fix | `sections[]` |
| **Visual** (optional) | A scene or interactive explorer at the end of a section | `sections[].visual` |
| **Practice** | Starter code that fails, a goal, a reference solution, checker rule | `exercises` + `checker` |
| **Check** | One multiple-choice question with 4 options and an explanation | `quiz` + `quiz-answers.ts` |

## Voice

- **Talk to one developer.** Use "you". Short sentences. Active voice.
- **Lead with the problem, not the API.** "Two trainers catch Lugia at the same moment, and one catch silently overwrites the other" before `ConditionExpression`.
- **Show the failure, then the fix.** Learners remember the bug they watched happen.
- **Name real numbers** where they matter (1 MB scan pages, 25-item batches, 5 GB single PUT), checked against the AWS docs.
- **No filler.** Cut "In this section we will…", "It's important to note that…", and "simply".
- **Keep the theme light.** The Pokémon framing carries the example. It never replaces the explanation.

## Practice exercises

- The **starter fails** for the reason the quest teaches. It doesn't fail because of a typo.
- The **goal** says what to achieve, not which line to type.
- The **reference solution** is idiomatic, production-shaped code: v3 SDK with `DynamoDBDocumentClient` / `S3Client`, or CDK v2 constructs.
- The **checker rule** returns the service's real error where one exists (`ConditionalCheckFailedException`, `NoSuchKey`, `ValidationException`). Otherwise it returns a one-sentence hint that points at the concept, not the answer.
- Add at least one **wrong-but-plausible** answer to the tests and make sure it fails with a helpful message.
- CDK quests need both **TypeScript and Python** versions.

## The check question

- Test understanding, not recall of a method name.
- Make all four options plausible. The wrong ones should be mistakes real developers make.
- Explain why the right answer is right in one or two sentences.
- Add its index to `lib/certificates/quiz-answers.ts`. Never reveal it in the lesson text.

## Accuracy checklist

- [ ] Checked against the current AWS documentation (link it in the PR).
- [ ] Limits, defaults, consistency and pricing units are stated correctly for today's service.
- [ ] Uses AWS SDK for JavaScript v3 or AWS CDK v2 only.
- [ ] No real account IDs, ARNs, endpoints or keys. Use `111122223333`, `ap-south-1` and obvious placeholder names.
- [ ] Pokémon names and Pokédex facts only. No official artwork.
- [ ] Tests updated: starter fails, solution passes, a plausible mistake fails with a clear message.

---

## Quest proposal template

```markdown
### Course and position
Course: DynamoDB / S3 / CDK
Part: (e.g. Johto) — goes after quest: (slug)

### Concept (one sentence)
What will the learner be able to do afterwards?

### The Pokédex problem
2–3 sentences: the situation where this concept saves the day.

### What goes wrong without it
The failure the learner will watch or trigger.

### Practice
- Starter: what's missing or wrong
- Goal: what success looks like
- Real error returned for the common mistake:

### Check question
Prompt, four options, the correct one, and why.

### Sources
Links to the AWS documentation pages this is based on.
```
