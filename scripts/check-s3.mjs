// Learn S3 contract test. Run against a server: TEST_ORIGIN=http://localhost:3100 npm run test:s3
// Needs Node 22.18+ (imports the TypeScript exercise file directly).
import assert from "node:assert/strict";
import { s3Exercises } from "../lib/s3/exercises.ts";
import { S3_QUIZ_ANSWERS } from "../lib/certificates/quiz-answers.ts";

const origin = process.env.TEST_ORIGIN || "http://localhost:3100";
const slugs = Array.from({ length: 12 }, (_, i) => `quest-${i + 1}`);

for (const path of ["", ...slugs.map((s) => "/" + s)]) {
  const res = await fetch(origin + "/s3" + path, { redirect: "manual" });
  assert.equal(res.status, 200, "status " + path);
  const html = await res.text();
  assert.ok(html.includes("https://serverlesscreed.com/s3" + path), "canonical missing: " + path);
  assert.ok(!/href="\/dynamodb\/quest/.test(html), "links into the DynamoDB course: " + path);
  if (path) {
    assert.ok(html.includes("Quick Quiz"), "quiz missing: " + path);
    const slug = path.slice(1);
    assert.equal(html.includes('id="practice"'), Boolean(s3Exercises[slug]), "practice section mismatch: " + path);
  }
}
assert.equal((await fetch(origin + "/s3/quest-13")).status, 404, "unknown quest should 404");

async function check(questId, code, status = 200) {
  const res = await fetch(origin + "/api/s3/simulate-quest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questId, code }),
  });
  assert.equal(res.status, status, questId);
  return res.json();
}

const ids = Object.keys(s3Exercises);
assert.equal(ids.length, 11, "exercises for quests 1–11");
for (const id of ids) {
  const { problemCode, solutionCode } = s3Exercises[id];
  const starter = await check(id, problemCode);
  assert.equal(starter.success, false, `${id}: starter code should fail`);
  const solution = await check(id, solutionCode);
  assert.equal(solution.success, true, `${id}: solution should pass — ${solution.message}`);
}

// Specific lessons the checker must teach.
const q = (id, from, to) => s3Exercises[id].solutionCode.replace(from, to);
assert.equal((await check("quest-1", q("quest-1", "hoenn-pokedex-archive-4821", "hoenn-pokedex"))).error, "BucketAlreadyExists");
assert.equal((await check("quest-1", q("quest-1", 'LocationConstraint: "ap-south-1"', 'LocationConstraint: "eu-west-1"'))).error, "IllegalLocationConstraintException");
assert.equal((await check("quest-3", q("quest-3", "0252-treecko", "0252-Treecko"))).error, "NoSuchKey");
assert.match((await check("quest-4", q("quest-4", '"sprites/grass/"', '"sprites/grass"'))).message, /grass-old/);
assert.equal((await check("quest-5", q("quest-5", "GLACIER_IR", "DEEP_ARCHIVE"))).success, false);
assert.equal((await check("quest-7", q("quest-7", "expiresIn: 300", "expiresIn: 700000"))).error, "AuthorizationQueryParametersError");
assert.equal((await check("quest-8", q("quest-8", "16 * 1024 * 1024", "4 * 1024 * 1024"))).error, "EntityTooSmall");
assert.equal((await check("quest-9", q("quest-9", "Days: 30,", "Days: 29,"))).error, "InvalidArgument");
assert.match((await check("quest-11", q("quest-11", '"sprites/originals/"', '"sprites/"'))).message, /Infinite loop/);
assert.equal((await check("quest-2", "const x = ;")).success, false, "syntax errors fail");
// Other correct solutions pass too.
assert.equal((await check("quest-4", 'for await (const page of paginateListObjectsV2({ client }, { Bucket: "hoenn-pokedex-media", Prefix: "sprites/grass/" })) {}')).success, true, "paginator");
assert.equal((await check("quest-6", q("quest-6", 'err.name === "PreconditionFailed"', "err.$metadata?.httpStatusCode === 412"))).success, true, "412 status check");
await check("quest-2", "", 400);
await check("quest-2", "x".repeat(20001), 413);

// Answers never ship in the page: checks are graded by /api/s3/check-answer.
const q4html = await (await fetch(origin + "/s3/quest-4")).text();
assert.ok(!/answerIndex/.test(q4html), "quiz answer shipped in the page");

// Certificates: stamps from passing S3 routes, then claim the three S3 tiers.
const learnerId = crypto.randomUUID();
async function answer(quest, option, status = 200) {
  const res = await fetch(origin + "/api/s3/check-answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quest, option, learnerId }) });
  assert.equal(res.status, status, "check-answer " + quest);
  return res.json();
}
const wrong = await answer("quest-1", (S3_QUIZ_ANSWERS["quest-1"] + 1) % 4);
assert.equal(wrong.correct, false);
assert.equal(wrong.stamp, undefined, "no stamp for a wrong answer");
await answer("quest-99", 0, 400);
const stamps = [];
for (const [quest, option] of Object.entries(S3_QUIZ_ANSWERS)) {
  const r = await answer(quest, option);
  assert.equal(r.correct, true, quest + " check");
  assert.ok(r.stamp, quest + " check stamp");
  stamps.push(r.stamp);
}
const failing = await fetch(origin + "/api/s3/simulate-quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: "quest-1", code: s3Exercises["quest-1"].problemCode, learnerId }) });
assert.equal((await failing.json()).stamp, undefined, "no stamp for a failing run");
for (const id of ids) {
  const res = await fetch(origin + "/api/s3/simulate-quest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: id, code: s3Exercises[id].solutionCode, learnerId }) });
  const r = await res.json();
  assert.ok(r.stamp, id + " code stamp");
  stamps.push(r.stamp);
}
async function cert(body, status) {
  const res = await fetch(origin + "/api/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(res.status, status, JSON.stringify(body).slice(0, 80));
  return res.json();
}
// S3 stamps never count toward DynamoDB certificates (and the reverse): quest ids are prefixed "s3:".
assert.ok((await cert({ tier: "foundations", name: "Test Learner", learnerId, stamps }, 400)).missing.length > 0, "S3 stamps must not unlock DynamoDB");
const partial = stamps.filter((t) => !JSON.parse(Buffer.from(t.split(".")[0], "base64url")).q.endsWith("quest-12"));
assert.deepEqual((await cert({ tier: "s3-advanced", name: "Test Learner", learnerId, stamps: partial }, 400)).missing, ["s3:quest-12:check"]);
const issued = {};
for (const tier of ["s3-foundations", "s3-advanced", "s3-practitioner"]) {
  issued[tier] = await cert({ tier, name: "Test Learner", learnerId, stamps }, 201);
  assert.match(issued[tier].id, /^SC-/);
}
const page = await (await fetch(origin + "/c/" + issued["s3-practitioner"].id)).text();
assert.ok(page.includes("Object Storage Practitioner") && page.includes("for Amazon S3"), "S3 certificate page");
assert.ok(page.includes('href="/s3/quest-12"') && !page.includes('href="/dynamodb/quest'), "certificate links to S3 quests");
assert.ok(!/Pok[eé]mon/.test(page.match(/<main[\s\S]*<\/main>/)?.[0] ?? ""), "no Pokémon names on the certificate page");
const og = await fetch(origin + "/c/" + issued["s3-foundations"].id + "/opengraph-image");
assert.equal(og.status, 200, "social image");
assert.equal(og.headers.get("content-type"), "image/png");
for (const { id, manageKey } of Object.values(issued)) {
  assert.equal((await fetch(origin + "/api/certificates/" + id, { method: "DELETE", headers: { "x-manage-key": manageKey } })).status, 200);
}

console.log(`Learn S3: ${slugs.length + 1} pages, ${ids.length} exercises, and certificates (stamps, course isolation, 3 tiers, page, OG, delete) OK`);
