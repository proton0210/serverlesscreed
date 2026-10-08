// Unit test for Learn CDK: every starter must fail and every solution must pass, in both languages.
// Run: node --no-warnings --experimental-strip-types scripts/check-cdk-unit.mjs
import { execFileSync } from "node:child_process";
import { checkCdkQuest } from "../lib/cdk/checker.ts";
import { cdkExercises } from "../lib/cdk/exercises.ts";
import { parseTs } from "../lib/cdk/parse-ts.ts";

let failures = 0;
const bad = (m) => { failures++; console.log("  ✗ " + m); };
const good = (m) => console.log("  ✓ " + m);

for (const [quest, ex] of Object.entries(cdkExercises)) {
  console.log(quest);
  for (const lang of ["typescript", "python"]) {
    const { problemCode, solutionCode } = ex[lang];
    for (const [kind, code] of [["starter", problemCode], ["solution", solutionCode]]) {
      if (lang === "python") {
        try { execFileSync("python3", ["-I", "-c", "import ast,sys;ast.parse(sys.stdin.read())"], { input: code, stdio: ["pipe", "ignore", "pipe"] }); }
        catch (e) { bad(`${lang} ${kind} is not valid Python: ${String(e.stderr).trim().split("\n").pop()}`); }
      } else if (!parseTs(code).ok) bad(`${lang} ${kind} does not parse`);
    }
    const s = checkCdkQuest(quest, problemCode, lang);
    s.success ? bad(`${lang} starter passes (should fail)`) : good(`${lang} starter fails: ${s.message.slice(0, 90)}`);
    const a = checkCdkQuest(quest, solutionCode, lang);
    a.success ? good(`${lang} solution passes`) : bad(`${lang} solution fails: ${a.message}`);
  }
}
// ── regressions from the audits ──────────────────────────────────────────
import { findCredentials } from "../lib/cdk/scan.ts";
console.log("audit regressions");
const sol = (q, l) => cdkExercises[q][l].solutionCode;
const expect = (name, got, want) => (got === want ? good(name) : bad(`${name}: got ${got}, wanted ${want}`));
const pass = (q, l, code) => checkCdkQuest(q, code, l).success;

const deepTs = "const x = " + "(".repeat(800) + "1" + ")".repeat(800) + ";";
const t0 = Date.now();
expect("deep nesting fails cleanly", checkCdkQuest("quest-1", deepTs, "typescript").success, false);
expect("deep python nesting fails cleanly", checkCdkQuest("quest-1", "x = " + "(".repeat(800) + "1" + ")".repeat(800), "python").success, false);
expect("long chain does not crash", checkCdkQuest("quest-1", "const x = 1" + "+1".repeat(6000) + ";", "typescript").success, false);
expect("pathological input is fast", Date.now() - t0 < 2000, true);
expect("quest-8 rejects OBJECT_REMOVED", pass("quest-8", "typescript", sol("quest-8", "typescript").replace("OBJECT_CREATED", "OBJECT_REMOVED")), false);
expect("quest-10 rejects Match.anyValue() for versioning", pass("quest-10", "typescript", sol("quest-10", "typescript").replace(/VersioningConfiguration: \{[^}]*\}/, "VersioningConfiguration: Match.anyValue()")), false);
expect("PYTHON_3_11 is accepted in quest-4", pass("quest-4", "python", sol("quest-4", "python").replace("PYTHON_3_13", "PYTHON_3_11")), true);
expect("PYTHON_3_9 is rejected in quest-4", pass("quest-4", "python", sol("quest-4", "python").replace("PYTHON_3_13", "PYTHON_3_9")), false);
expect("python str(table.table_name) works", pass("quest-4", "python", sol("quest-4", "python").replace("table.table_name", "str(table.table_name)")), true);
expect("python dict(TABLE_NAME=...) works", pass("quest-4", "python", sol("quest-4", "python").replace('{"TABLE_NAME": table.table_name}', "dict(TABLE_NAME=table.table_name)")), true);
const loop = checkCdkQuest("quest-11", 'import aws_cdk as cdk\nwhile False:\n    pass\n', "python");
expect("unsupported loops are named in the failure note", /doesn't run loops/.test(loop.message), true);
expect("unmodelled real API is not called nonexistent", /real CDK API/.test(checkCdkQuest("quest-5", sol("quest-5", "typescript").replace("grantReadData(lookupFn)", "grantReadData(lookupFn); lookupFn.role"), "typescript").message), true);
expect("credential scan: AKIA key", findCredentials('const k = "AKIAABCDEFGHIJKLMNOP";'), true);
expect("credential scan: comment line ignored", findCredentials("# AKIAABCDEFGHIJKLMNOP"), false);
expect("credential scan: clean solution", findCredentials(sol("quest-4", "typescript")), false);
expect("TS for-of loop creates constructs", pass("quest-11", "typescript", sol("quest-11", "typescript").replace('    new SecureBucket(this, "Cards");\n    new SecureBucket(this, "Sprites");', '    for (const n of ["Cards", "Sprites"]) {\n      new SecureBucket(this, n);\n    }')), true);
expect("Python for loop creates constructs", pass("quest-11", "python", sol("quest-11", "python").replace('        SecureBucket(self, "Cards")\n        SecureBucket(self, "Sprites")', '        for n in ["Cards", "Sprites"]:\n            SecureBucket(self, n)')), true);
expect("TS helper method on the stack", pass("quest-11", "typescript", sol("quest-11", "typescript").replace('    new SecureBucket(this, "Cards");\n    new SecureBucket(this, "Sprites");\n  }', '    this.make("Cards");\n    this.make("Sprites");\n  }\n\n  private make(n: string) {\n    new SecureBucket(this, n);\n  }')), true);
expect("Python helper method on the stack", pass("quest-11", "python", sol("quest-11", "python").replace('        SecureBucket(self, "Cards")\n        SecureBucket(self, "Sprites")', '        self.make("Cards")\n        self.make("Sprites")\n\n    def make(self, n):\n        SecureBucket(self, n)')), true);
expect("a loop that makes the wrong ids still fails", pass("quest-11", "python", sol("quest-11", "python").replace('        SecureBucket(self, "Cards")\n        SecureBucket(self, "Sprites")', '        for n in ["Cards", "Other"]:\n            SecureBucket(self, n)')), false);
expect("quest-10 accepts hasResource with Properties", pass("quest-10", "typescript", sol("quest-10", "typescript").replace(/template\.hasResourceProperties\("AWS::DynamoDB::Table", \{\s*BillingMode: "PAY_PER_REQUEST",?\s*\}\);/, 'template.hasResource("AWS::DynamoDB::Table", { Properties: { BillingMode: "PAY_PER_REQUEST" } });')), true);
import { md5Hex, logicalIdFor } from "../lib/cdk/md5.ts";
import { logicalId } from "../lib/cdk/synth.ts";
import { createHash } from "node:crypto";
for (const t of ["", "a", "CardsBucket/Resource", "x".repeat(55), "x".repeat(64), "Pokédex/ü"]) expect(`md5 matches node:crypto (${t.slice(0, 12)})`, md5Hex(t), createHash("md5").update(t).digest("hex"));
expect("browser logical IDs match the synthesizer", logicalIdFor(["Cards", "Bucket", "Resource"]), logicalId(["Cards", "Bucket", "Resource"]));
expect("CardsBucket logical id", logicalIdFor(["CardsBucket", "Resource"]), "CardsBucket685ECB20");
expect("break stops a TS loop", pass("quest-11", "typescript", sol("quest-11", "typescript").replace('    new SecureBucket(this, "Cards");\n    new SecureBucket(this, "Sprites");', '    for (const n of ["Cards", "Sprites", "Extra"]) {\n      new SecureBucket(this, n);\n      if (n === "Sprites") break;\n    }')), true);
expect("continue skips in a Python loop", pass("quest-11", "python", sol("quest-11", "python").replace('        SecureBucket(self, "Cards")\n        SecureBucket(self, "Sprites")', '        for n in ["Cards", "Skip", "Sprites"]:\n            if n == "Skip":\n                continue\n            SecureBucket(self, n)')), true);
expect("TS loop variable does not leak", pass("quest-11", "typescript", sol("quest-11", "typescript").replace('    new SecureBucket(this, "Cards");\n    new SecureBucket(this, "Sprites");', '    let n = "Cards";\n    for (const n of ["x"]) { void n; }\n    new SecureBucket(this, n);\n    new SecureBucket(this, "Sprites");')), true);
expect("python %02d in a loop", pass("quest-11", "python", sol("quest-11", "python").replace('        SecureBucket(self, "Cards")\n        SecureBucket(self, "Sprites")', '        for n in range(2):\n            SecureBucket(self, ["Cards", "Sprites"][n] + "%02d" % 0)')), false);
const q12 = (l, f) => pass("quest-12", l, f(sol("quest-12", l)));
expect("quest-12 ignores an unrelated good bucket when CardsBucket is wrong", q12("typescript", (c) => c.replace('    new s3.Bucket(this, "CardsBucket"', '    new s3.Bucket(this, "Other", { versioned: true, enforceSSL: true, removalPolicy: cdk.RemovalPolicy.RETAIN });\n    new s3.Bucket(this, "CardsBucket"').replace("      versioned: true,\n      enforceSSL: true,\n      removalPolicy: cdk.RemovalPolicy.RETAIN,\n    });\n  }", "      removalPolicy: cdk.RemovalPolicy.DESTROY,\n    });\n  }")), false);
expect("quest-12 allows an extra unrelated bucket", q12("typescript", (c) => c.replace('    new s3.Bucket(this, "CardsBucket"', '    new s3.Bucket(this, "LogsBucket", { removalPolicy: cdk.RemovalPolicy.DESTROY });\n    new s3.Bucket(this, "CardsBucket"')), true);
expect("DAG doubling is refused quickly", (() => { const t = Date.now(); const r = checkCdkQuest("quest-1", "let a: any = [];\n" + "a = [a, a];\n".repeat(60) + "const s = `${a}`;", "typescript"); return !r.success && Date.now() - t < 1000; })(), true);
expect("string doubling is refused quickly", (() => { const t = Date.now(); const r = checkCdkQuest("quest-1", 's = "a"\n' + "s = s + s\n".repeat(40), "python"); return !r.success && Date.now() - t < 1000; })(), true);
expect("quest-10 accepts Match.objectLike", pass("quest-10", "typescript", sol("quest-10", "typescript").replace('import { Template }', 'import { Match, Template }').replace('template.hasResourceProperties("AWS::S3::Bucket", {\n    VersioningConfiguration: { Status: "Enabled" },\n  });', 'template.hasResourceProperties("AWS::S3::Bucket", Match.objectLike({ VersioningConfiguration: { Status: "Enabled" } }));')), true);
expect("quest-4 accepts addEnvironment", pass("quest-4", "typescript", sol("quest-4", "typescript").replace("    new lambda.Function(", "    const fn = new lambda.Function(").replace("      environment: { TABLE_NAME: table.tableName },\n    });", "    });\n    fn.addEnvironment(\"TABLE_NAME\", table.tableName);")), true);
expect("quest-9 accepts applyRemovalPolicy-free solution still", pass("quest-9", "typescript", sol("quest-9", "typescript")), true);
expect("quest-8 rejects a second unfiltered notification", pass("quest-8", "typescript", sol("quest-8", "typescript").replace(/(bucket\.addEventNotification\([\s\S]*?\);)/, '$1\n    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(processorFn));')), false);
expect("array indexing works", pass("quest-11", "python", sol("quest-11", "python").replace('        SecureBucket(self, "Cards")\n        SecureBucket(self, "Sprites")', '        ids = ["Cards", "Sprites"]\n        SecureBucket(self, ids[0])\n        SecureBucket(self, ids[-1])')), true);
expect("forEach over a list works", pass("quest-11", "typescript", sol("quest-11", "typescript").replace('    new SecureBucket(this, "Cards");\n    new SecureBucket(this, "Sprites");', '    ["Cards", "Sprites"].forEach((n) => new SecureBucket(this, n));')), true);
expect("process.env cannot decide a prop", pass("quest-2", "typescript", sol("quest-2", "typescript").replace("versioned: true", "versioned: !!process.env.X")), false);
expect("an unconditional throw fails", pass("quest-1", "typescript", sol("quest-1", "typescript") + '\nthrow new Error("boom");\n'), false);
expect("prototype keys are not quests", checkCdkQuest("__proto__", "x", "typescript").success, false);

console.log(failures ? `\n${failures} failure(s)` : "\nAll CDK exercises behave.");
process.exit(failures ? 1 : 0);
