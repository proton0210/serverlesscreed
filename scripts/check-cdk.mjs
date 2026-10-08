// Learn CDK contract test. Run against a server: TEST_ORIGIN=http://localhost:3100 npm run test:cdk
// Needs Node 22.18+ (imports the TypeScript exercise file directly).
import assert from "node:assert/strict";
import { cdkExercises } from "../lib/cdk/exercises.ts";
import { CDK_QUIZ_ANSWERS } from "../lib/certificates/quiz-answers.ts";

const origin = process.env.TEST_ORIGIN || "http://localhost:3100";
const slugs = Array.from({ length: 12 }, (_, i) => `quest-${i + 1}`);

for (const path of ["", ...slugs.map((s) => "/" + s)]) {
  const res = await fetch(origin + "/cdk" + path, { redirect: "manual" });
  assert.equal(res.status, 200, "status " + path);
  const html = await res.text();
  assert.ok(html.includes("https://serverlesscreed.com/cdk" + path), "canonical missing: " + path);
  assert.ok(!/href="\/dynamodb\/quest/.test(html), "links into the DynamoDB course: " + path);
  if (path) {
    assert.ok(html.includes("Quick Quiz"), "quiz missing: " + path);
    const slug = path.slice(1);
    assert.equal(html.includes('id="practice"'), Boolean(cdkExercises[slug]), "practice section mismatch: " + path);
  }
}
assert.equal((await fetch(origin + "/cdk/quest-13")).status, 404, "unknown quest should 404");

async function check(questId, code, language = "typescript", status = 200) {
  const res = await fetch(origin + "/api/cdk/simulate-quest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questId, code, language }),
  });
  assert.equal(res.status, status, questId);
  return res.json();
}

const ids = Object.keys(cdkExercises);
assert.equal(ids.length, 12, "exercises for quests 1–12");
for (const id of ids) {
  for (const language of ["typescript", "python"]) {
    const { problemCode, solutionCode } = cdkExercises[id][language];
    const starter = await check(id, problemCode, language);
    assert.equal(starter.success, false, `${id}/${language}: starter code should fail`);
    const solution = await check(id, solutionCode, language);
    assert.equal(solution.success, true, `${id}/${language}: solution should pass — ${solution.message}`);
  }
}

// Specific lessons the checker must teach (TypeScript and Python behave alike).
const q = (id, lang, from, to) => cdkExercises[id][lang].solutionCode.replace(from, to);
assert.equal((await check("quest-2", cdkExercises["quest-2"].typescript.problemCode, "typescript")).error, "ValidationError");
assert.match((await check("quest-4", q("quest-4", "typescript", "NODEJS_22_X", "NODEJS_20_X"), "typescript")).message, /deprecated/);
assert.match((await check("quest-8", q("quest-8", "python", '"sprites/originals/"', '"sprites/"'), "python")).message, /Infinite loop/);
assert.equal((await check("quest-9", q("quest-9", "typescript", "RETAIN", "DESTROY"), "typescript")).success, false);
assert.equal((await check("quest-2", "const x = ;", "typescript")).success, false, "syntax errors fail");
await check("quest-2", "", "typescript", 400);
await check("quest-2", "x".repeat(20001), "typescript", 413);
await check("quest-2", "x = 1", "ruby", 400);

// Answers never ship in the page: checks are graded by /api/cdk/check-answer.
const q4html = await (await fetch(origin + "/cdk/quest-4")).text();
assert.ok(!/answerIndex/.test(q4html), "quiz answer shipped in the page");

// Certificates: stamps from passing CDK routes, then claim the three CDK tiers.
const learnerId = crypto.randomUUID();
async function answer(quest, option, status = 200) {
  const res = await fetch(origin + "/api/cdk/check-answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quest, option, learnerId }) });
  assert.equal(res.status, status, "check-answer " + quest);
  return res.json();
}
const wrong = await answer("quest-1", (CDK_QUIZ_ANSWERS["quest-1"] + 1) % 4);
assert.equal(wrong.correct, false);
assert.equal(wrong.stamp, undefined, "no stamp for a wrong answer");
await answer("quest-99", 0, 400);
const stamps = [];
for (const [quest, option] of Object.entries(CDK_QUIZ_ANSWERS)) {
  const r = await answer(quest, option);
  assert.equal(r.correct, true, quest + " check");
  assert.ok(r.stamp, quest + " check stamp");
  stamps.push(r.stamp);
}
const failing = await fetch(origin + "/api/cdk/simulate-quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: "quest-1", code: cdkExercises["quest-1"].typescript.problemCode, language: "typescript", learnerId }) });
assert.equal((await failing.json()).stamp, undefined, "no stamp for a failing run");
for (const id of ids) {
  const res = await fetch(origin + "/api/cdk/simulate-quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: id, code: cdkExercises[id].typescript.solutionCode, language: "typescript", learnerId }) });
  const r = await res.json();
  assert.ok(r.stamp, id + " code stamp");
  stamps.push(r.stamp);
}
async function cert(body, status) {
  const res = await fetch(origin + "/api/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(res.status, status, JSON.stringify(body).slice(0, 80));
  return res.json();
}
// CDK stamps never count toward DynamoDB certificates (and the reverse): quest ids are prefixed "cdk:".
assert.ok((await cert({ tier: "foundations", name: "Test Learner", learnerId, stamps }, 400)).missing.length > 0, "CDK stamps must not unlock DynamoDB");
const partial = stamps.filter((t) => !JSON.parse(Buffer.from(t.split(".")[0], "base64url")).q.endsWith("quest-12"));
assert.deepEqual((await cert({ tier: "cdk-advanced", name: "Test Learner", learnerId, stamps: partial }, 400)).missing, ["cdk:quest-12:code", "cdk:quest-12:check"]);
const issued = {};
for (const tier of ["cdk-foundations", "cdk-advanced", "cdk-practitioner"]) {
  issued[tier] = await cert({ tier, name: "Test Learner", learnerId, stamps }, 201);
  assert.match(issued[tier].id, /^SC-/);
}
const page = await (await fetch(origin + "/c/" + issued["cdk-practitioner"].id)).text();
assert.ok(page.includes("Infrastructure as Code Practitioner") && page.includes("for the AWS Cloud Development Kit"), "CDK certificate page");
assert.ok(page.includes('href="/cdk/quest-12"') && !page.includes('href="/dynamodb/quest'), "certificate links to CDK quests");
assert.ok(!/Pok[eé]mon/.test(page.match(/<main[\s\S]*<\/main>/)?.[0] ?? ""), "no Pokémon names on the certificate page");
const og = await fetch(origin + "/c/" + issued["cdk-foundations"].id + "/opengraph-image");
assert.equal(og.status, 200, "social image");
assert.equal(og.headers.get("content-type"), "image/png");
for (const { id, manageKey } of Object.values(issued)) {
  assert.equal((await fetch(origin + "/api/certificates/" + id, { method: "DELETE", headers: { "x-manage-key": manageKey } })).status, 200);
}

console.log(`Learn CDK: ${slugs.length + 1} pages, ${ids.length} exercises, and certificates (stamps, course isolation, 3 tiers, page, OG, delete) OK`);
