/**
 * Checks Learn CDK practice code without running it: the code is parsed (TypeScript with the compiler's parser, Python
 * with parse-py.ts), "run" by the interpreter in a sandbox of plain values, synthesized into a CloudFormation template
 * the way `cdk synth` would, and then judged by each quest's rules. A passing check answers with the template.
 *
 * Keep this file free of path aliases and JSX: scripts/check-cdk-unit.mjs imports it directly.
 */
import type { Language } from "./ir.ts";
import { parseTs } from "./parse-ts.ts";
import { parsePython } from "./parse-py.ts";
import { Interp } from "./interp.ts";
import type { RunResult } from "./interp.ts";
import { AGEING_BUT_OK_RUNTIMES, AGING_RUNTIMES, BUCKET_PUT, CURRENT_RUNTIMES, TABLE_READ, snake } from "./catalog.ts";
import { Cons, Dur, Matcher, PathVal, SimError, Tok, ValueObj, isRec } from "./model.ts";
import type { IamStatement } from "./model.ts";
import { countByType, logicalId } from "./synth.ts";

export type CheckResult = {
  success: boolean;
  message: string;
  /** The error class the real tool would report (TS2345, TypeError, ValidationError, …). */
  error?: string;
  /** The synthesized template(s) on success. */
  data?: unknown;
};

const ok = (message: string, data?: unknown): CheckResult => ({ success: true, message, data });
const fail = (message: string, error?: string): CheckResult => ({ success: false, message, error });

type Ctx = {
  lang: Language;
  r: RunResult;
  /** Property name in the learner's language: removalPolicy / removal_policy. */
  p: (camel: string) => string;
  /** Text in the learner's language. */
  L: (ts: string, py: string) => string;
};

type Rule = (c: Ctx) => CheckResult;

const MARK = /\u0001(\d+)\u0002/g;

const leafOf = (v: unknown) => (v instanceof PathVal ? v.path.split(".").pop() ?? "" : "");
const is = (v: unknown, path: string) => v instanceof PathVal && v.path === path;

function find(stack: Cons, type: string): Cons[] {
  return stack.descendants().filter((c) => c.type === type && !c.imported);
}
const byId = (stack: Cons, type: string, id: string) => find(stack, type).find((c) => c.id === id);

/** True when `v` is the token `cons.attr`, or a string built from it (a template literal / f-string). */
function usesToken(c: Ctx, v: unknown, cons: Cons, attr: string): boolean {
  if (v instanceof Tok) return v.cons === cons && v.attr === attr;
  if (typeof v !== "string") return false;
  for (const m of v.matchAll(MARK)) {
    const t = c.r.tokens[Number(m[1])];
    if (t && t.cons === cons && t.attr === attr) return true;
  }
  return false;
}

function touches(s: IamStatement, cons: Cons): boolean {
  const walk = (v: unknown): boolean => {
    if (v instanceof Tok) return v.cons === cons;
    if (Array.isArray(v)) return v.some(walk);
    if (isRec(v)) return Object.values(v).some(walk);
    return false;
  };
  return s.resources.some(walk);
}

function data(c: Ctx, stacks: Cons[]) {
  const one = (s: Cons) => {
    const template = c.r.synth(s);
    return { stack: s.stackName, resources: countByType(template), template };
  };
  return stacks.length === 1 ? one(stacks[0]) : Object.fromEntries(stacks.map((s) => [s.stackName, one(s)]));
}

const noStack = (c: Ctx) =>
  fail(
    c.L(
      "`cdk synth` found nothing to deploy: the app contains no stack. Create one with new PokedexStack(app, \"PokedexStack\").",
      "`cdk synth` found nothing to deploy: the app contains no stack. Create one with PokedexStack(app, \"PokedexStack\")."
    ),
    "NoStacks"
  );

/* ── quest rules ────────────────────────────────────────────────────────── */

const rules: Record<string, Rule> = {
  "quest-1": (c) => {
    const { r } = c;
    if (!r.app) return fail(c.L("There is no App. Every CDK program starts with `new cdk.App()`.", "There is no App. Every CDK program starts with `app = cdk.App()`."));
    if (!r.stacks.length) return noStack(c);
    if (r.stacks.length > 1) return fail("This quest deploys one stack. Create PokedexStack once.");
    const s = r.stacks[0];
    if (s.userClass !== "PokedexStack") return fail("Create an instance of your PokedexStack class, so the resources you write in its constructor are part of the app.");
    if (s.id !== "PokedexStack") return fail(`The stack id must be "PokedexStack", not "${s.id}". The id becomes the CloudFormation stack name.`);
    if (typeof s.props.description !== "string" || !s.props.description.trim()) return fail(`Add a ${c.p("description")}: it shows up in the CloudFormation console and tells the next engineer what this stack is for.`);
    const env = s.props.env;
    if (!isRec(env) || env.region !== "ap-south-1") {
      return fail(
        c.L(
          'Pin the stack to a Region with env: { region: "ap-south-1" }. Without it, the stack deploys wherever your CLI happens to point.',
          'Pin the stack to a Region with env=cdk.Environment(region="ap-south-1"). Without it, the stack deploys wherever your CLI happens to point.'
        )
      );
    }
    return ok("`cdk synth` works: one stack, PokedexStack, pinned to ap-south-1. It has no resources yet — that is next.", data(c, [s]));
  },

  "quest-2": (c) => {
    const s = c.r.stacks[0];
    if (!s) return noStack(c);
    const b = byId(s, "s3.Bucket", "CardsBucket");
    if (!b) return fail(c.L('Create the bucket with new s3.Bucket(this, "CardsBucket", { … }).', 'Create the bucket with s3.Bucket(self, "CardsBucket", …).'));
    const pr = b.props;
    if (pr.versioned !== true) return fail(`Turn on versioning (${c.p("versioned")}: ${c.L("true", "True")}) so an overwritten or deleted card can be recovered.`);
    if (!is(pr.blockPublicAccess, "s3.BlockPublicAccess.BLOCK_ALL")) return fail(`Block all public access: ${c.p("blockPublicAccess")}: s3.BlockPublicAccess.BLOCK_ALL.`);
    if (pr.enforceSSL !== true) return fail(`Refuse plain-HTTP requests with ${c.p("enforceSSL")}: ${c.L("true", "True")}. CDK adds a bucket policy that denies requests without TLS.`);
    if (!is(pr.removalPolicy, "core.RemovalPolicy.DESTROY")) return fail(`This is the dev stack, so delete the bucket with the stack: ${c.p("removalPolicy")}: cdk.RemovalPolicy.DESTROY. (Production would keep the default, RETAIN.)`);
    if (pr.autoDeleteObjects !== true) return fail(`A bucket with objects can't be deleted. Add ${c.p("autoDeleteObjects")}: ${c.L("true", "True")} so CDK empties it first.`);
    return ok("Synthesized. One line of L2 code became a bucket, a bucket policy and a small clean-up function.", data(c, [s]));
  },

  "quest-3": (c) => {
    const s = c.r.stacks[0];
    if (!s) return noStack(c);
    const t = byId(s, "dynamodb.Table", "PokedexTable");
    if (!t) return fail("Create the table with id \"PokedexTable\".");
    const pr = t.props;
    const pk = pr.partitionKey;
    if (!isRec(pk) || pk.name !== "pokedexNumber") return fail('The partition key is the Pokédex number: name "pokedexNumber".');
    if (!is(pk.type, "dynamodb.AttributeType.NUMBER")) return fail("The Pokédex number is a Number: dynamodb.AttributeType.NUMBER. As a String, \"10\" would sort before \"9\".");
    const sk = pr.sortKey;
    if (!isRec(sk) || sk.name !== "formId" || !is(sk.type, "dynamodb.AttributeType.STRING")) return fail(`Add a sort key ${c.p("sortKey")} named "formId" of type STRING, so one number can have several forms.`);
    if (!is(pr.billingMode, "dynamodb.BillingMode.PAY_PER_REQUEST")) return fail(`Bill on demand: ${c.p("billingMode")}: dynamodb.BillingMode.PAY_PER_REQUEST. The default is PROVISIONED with 5 read and 5 write units.`);
    const spec = pr.pointInTimeRecoverySpecification;
    if (!(pr.pointInTimeRecovery === true || (isRec(spec) && spec.pointInTimeRecoveryEnabled === true))) {
      return fail(`Turn on point-in-time recovery: ${c.p("pointInTimeRecoverySpecification")}: ${c.L("{ pointInTimeRecoveryEnabled: true }", "dynamodb.PointInTimeRecoverySpecification(point_in_time_recovery_enabled=True)")}.`);
    }
    const gsi = t.indexes.find((i) => i.indexName === "byType");
    if (!gsi) return fail(`Add the index: ${c.L('table.addGlobalSecondaryIndex({ indexName: "byType", … })', 'table.add_global_secondary_index(index_name="byType", …)')} so trainers can list Pokémon by type.`);
    const gk = gsi.partitionKey;
    if (!isRec(gk) || gk.name !== "primaryType" || !is(gk.type, "dynamodb.AttributeType.STRING")) return fail('The byType index is keyed by "primaryType" of type STRING.');
    return ok("Synthesized. The table has a composite key, on-demand billing, recovery and a global secondary index.", data(c, [s]));
  },

  "quest-4": (c) => {
    const s = c.r.stacks[0];
    if (!s) return noStack(c);
    const table = byId(s, "dynamodb.Table", "PokedexTable");
    const fn = byId(s, "lambda.Function", "LookupFn");
    if (!table) return fail("Keep the table (id \"PokedexTable\") from the starter.");
    if (!fn) return fail("Create the function with id \"LookupFn\".");
    const rt = leafOf(fn.props.runtime);
    if ((AGING_RUNTIMES as readonly string[]).includes(rt)) {
      return fail(`${rt} is deprecated by Lambda: deployment would be refused, and so would later updates. (The simulator flags it early.) Pick a current runtime: ${CURRENT_RUNTIMES.join(", ")}.`, "DeprecatedRuntime");
    }
    if (!(CURRENT_RUNTIMES as readonly string[]).includes(rt) && !(AGEING_BUT_OK_RUNTIMES as readonly string[]).includes(rt)) return fail(`Use a current runtime: ${CURRENT_RUNTIMES.join(", ")}.`);
    const t = fn.props.timeout;
    if (!(t instanceof Dur) || t.seconds < 5 || t.seconds > 29) return fail(`Set ${c.p("timeout")} to cdk.Duration.seconds(10). The default is 3 seconds, and API Gateway's default limit is 29.`);
    const mem = fn.props.memorySize;
    if (typeof mem !== "number" || mem < 256 || mem > 1024) return fail(`Give the function ${c.p("memorySize")}: 256 (MB). CPU scales with memory, and the default is only 128.`);
    const env = { ...(isRec(fn.props.environment) ? fn.props.environment : {}), ...fn.envAdds };
    const tn = env.TABLE_NAME;
    if (typeof tn === "string" && !tn.includes("\u0001")) {
      return fail(`TABLE_NAME is the literal "${tn}". CDK generates the real table name when it deploys (something like PokedexTable-…), so a literal points at a table that doesn't exist. Use table.${c.p("tableName")}.`);
    }
    if (!usesToken(c, tn, table, "tableName")) return fail(`Set TABLE_NAME to table.${c.p("tableName")}.`);
    return ok("Synthesized. TABLE_NAME is a reference to the table, resolved when CloudFormation deploys.", data(c, [s]));
  },

  "quest-5": (c) => {
    const s = c.r.stacks[0];
    if (!s) return noStack(c);
    const table = byId(s, "dynamodb.Table", "PokedexTable");
    const bucket = byId(s, "s3.Bucket", "CardsBucket");
    const lookup = byId(s, "lambda.Function", "LookupFn");
    const upload = byId(s, "lambda.Function", "UploadFn");
    if (!table || !bucket || !lookup || !upload) return fail("Keep the table, the bucket and both functions (LookupFn and UploadFn) from the starter.");
    for (const fn of [lookup, upload]) {
      for (const st of fn.statements) {
        const wide = st.resources.some((x) => x === "*") || st.actions.some((a) => a === "*" || a.endsWith(":*"));
        if (wide) return fail(`${fn.id} still has a wildcard policy (${st.actions.join(", ")} on ${st.resources.some((x) => x === "*") ? "*" : "a resource"}). Delete the ${c.p("addToRolePolicy")} calls and use grants: they generate the narrowest policy for exactly one resource.`, "OverlyPermissive");
      }
    }
    const actionsOf = (fn: Cons, target: Cons) => fn.statements.filter((st) => touches(st, target)).flatMap((st) => st.actions);
    const g = (n: string) => c.L(n, snake(n));
    const lt = actionsOf(lookup, table);
    if (!TABLE_READ.every((a) => lt.includes(a))) return fail(`LookupFn can't read the table yet. Call table.${g("grantReadData")}(lookupFn).`);
    if (lt.some((a) => /dynamodb:(Put|Update|Delete|BatchWrite)/.test(a))) return fail("LookupFn only reads, so it must not be able to write to the table. Use grantReadData, not grantReadWriteData.");
    const lb = actionsOf(lookup, bucket);
    if (!lb.includes("s3:GetObject*")) return fail(`LookupFn can't read card files yet. Call bucket.${g("grantRead")}(lookupFn).`);
    if (lb.some((a) => /s3:(Put|Delete|Abort)/.test(a))) return fail("LookupFn only reads cards: it shouldn't be able to put or delete objects.");
    const ub = actionsOf(upload, bucket);
    if (!BUCKET_PUT.every((a) => ub.includes(a))) return fail(`UploadFn can't put objects yet. Call bucket.${g("grantPut")}(uploadFn).`);
    if (ub.some((a) => a === "s3:GetObject*" || a === "s3:List*")) return fail("UploadFn only uploads, so it must not be able to read or list the bucket. Use grantPut, not grantReadWrite.");
    if (actionsOf(upload, table).length) return fail("UploadFn has no business touching the table. Remove its table access.");
    return ok("Synthesized. Each function's policy now lists only the actions it needs on exactly one resource.", {
      LookupFn: c.r.synth(s).Resources,
      note: "See the AWS::IAM::Policy resources: each ends in a narrow Action list and a Resource that is a reference, not *.",
    });
  },

  "quest-6": (c) => {
    const s = c.r.stacks[0];
    if (!s) return noStack(c);
    const table = byId(s, "dynamodb.Table", "PokedexTable");
    const bucket = byId(s, "s3.Bucket", "CardsBucket");
    const fn = byId(s, "lambda.Function", "LookupFn");
    if (!table || !bucket || !fn) return fail("Keep the table, the bucket and LookupFn from the starter.");
    const env = { ...(isRec(fn.props.environment) ? fn.props.environment : {}), ...fn.envAdds };
    const prefix = env.CARD_PREFIX;
    if (typeof prefix === "string" && !prefix.includes("\u0001")) {
      return fail(`CARD_PREFIX is the literal "${prefix}". The bucket's real name is generated at deploy time, so the function would read from a bucket that doesn't exist. Build it from bucket.${c.p("bucketName")}.`);
    }
    if (!usesToken(c, prefix, bucket, "bucketName")) return fail(`Build CARD_PREFIX from bucket.${c.p("bucketName")}, like ${c.L("`s3://${bucket.bucketName}/cards/`", 'f"s3://{bucket.bucket_name}/cards/"')}.`);
    if (!String(prefix).endsWith("/cards/")) return fail("CARD_PREFIX should end with /cards/.");
    const outputs = s.children.filter((x) => x.type === "core.CfnOutput");
    const bucketOut = outputs.find((o) => o.id === "CardsBucketName");
    const tableOut = outputs.find((o) => o.id === "PokedexTableArn");
    if (!bucketOut) return fail('Export the bucket name with a CfnOutput whose id is "CardsBucketName".');
    if (typeof bucketOut.props.value === "string" && !bucketOut.props.value.includes("\u0001")) return fail(`"CardsBucketName" is a literal string. Use bucket.${c.p("bucketName")} so the output shows the real name after every deploy.`);
    if (!usesToken(c, bucketOut.props.value, bucket, "bucketName")) return fail(`"CardsBucketName" should be bucket.${c.p("bucketName")}.`);
    if (!tableOut) return fail('Export the table ARN with a CfnOutput whose id is "PokedexTableArn".');
    if (!usesToken(c, tableOut.props.value, table, "tableArn")) return fail(`"PokedexTableArn" should be table.${c.p("tableArn")}.`);
    const t = c.r.synth(s);
    return ok("Synthesized. Tokens became Ref, Fn::GetAtt and Fn::Join — values CloudFormation fills in at deploy time.", { Outputs: t.Outputs, LookupFnEnvironment: Object.values(t.Resources).find((x) => x.Type === "AWS::Lambda::Function" && isRec(x.Properties) && isRec(x.Properties.Environment))?.Properties });
  },

  "quest-7": (c) => {
    const s = c.r.stacks[0];
    if (!s) return noStack(c);
    const lookup = byId(s, "lambda.Function", "LookupFn");
    const api = find(s, "apigateway.RestApi")[0] ?? find(s, "apigateway.LambdaRestApi")[0];
    if (!lookup) return fail("Keep LookupFn from the starter.");
    if (!api) return fail(c.L('Create the API with new apigw.RestApi(this, "PokedexApi", { … }).', 'Create the API with apigw.RestApi(self, "PokedexApi", …).'));
    const stage = isRec(api.props.deployOptions) ? api.props.deployOptions.stageName : undefined;
    if (stage !== "v1") return fail(`Name the stage "v1" with ${c.L('deployOptions: { stageName: "v1" }', 'deploy_options=apigw.StageOptions(stage_name="v1")')}. The default is "prod".`);
    if (api.apiMethods.some((m) => m.method === "ANY")) return fail("A proxy route (ANY) sends every path to the function. Define explicit routes instead: GET /pokemon/{number}.");
    const m = api.apiMethods.find((x) => x.method === "GET" && x.path.join("/") === "pokemon/{number}");
    if (!m) {
      return fail(
        c.L(
          'Add the route: api.root.addResource("pokemon").addResource("{number}").addMethod("GET", new apigw.LambdaIntegration(lookupFn)).',
          'Add the route: api.root.add_resource("pokemon").add_resource("{number}").add_method("GET", apigw.LambdaIntegration(lookup_fn)).'
        )
      );
    }
    const handler = m.integration instanceof ValueObj ? m.integration.props.handler : undefined;
    if (handler !== lookup) return fail("GET /pokemon/{number} should call LookupFn: pass it to LambdaIntegration.");
    return ok("Synthesized. The route created a resource, a method, a deployment, a stage and the permissions API Gateway needs to call the function.", data(c, [s]));
  },

  "quest-8": (c) => {
    const s = c.r.stacks[0];
    if (!s) return noStack(c);
    const bucket = byId(s, "s3.Bucket", "CardsBucket");
    const fn = byId(s, "lambda.Function", "ProcessorFn");
    if (!bucket || !fn) return fail("Keep the bucket and ProcessorFn from the starter.");
    const mine = bucket.notifications.filter((x) => x.dest === fn);
    if (!mine.length) return fail("Subscribe ProcessorFn to the bucket's OBJECT_CREATED event.");
    if (mine.some((n) => !n.events.some((e) => e.startsWith("s3:ObjectCreated")))) return fail("Thumbnails are made for new sprites, so listen for s3.EventType.OBJECT_CREATED.");
    // S3 rejects overlapping notifications, and every one of them can start the loop: judge them together.
    const matches = (key: string) => mine.some((n) => (n.prefix === undefined || key.startsWith(n.prefix)) && (n.suffix === undefined || key.endsWith(n.suffix)));
    if (matches("sprites/thumbs/0252-treecko.png")) {
      return fail("Infinite loop: ProcessorFn writes thumbnails to sprites/thumbs/ in the same bucket, and every thumbnail matches this notification and invokes the function again. Narrow it to originals: prefix \"sprites/originals/\".", "RecursiveInvocation");
    }
    if (!matches("sprites/originals/0252-treecko.png")) return fail("New originals such as sprites/originals/0252-treecko.png must still trigger the function.");
    if (matches("sprites/originals/0252-treecko.json")) return fail('Only PNG sprites need thumbnails. Add a suffix filter: suffix ".png".');
    return ok("Synthesized. CDK added the invoke permission and a custom resource that writes the bucket's notification configuration.", data(c, [s]));
  },

  "quest-9": (c) => {
    const { r } = c;
    const dev = r.stacks.find((x) => x.id === "PokedexDev");
    const prod = r.stacks.find((x) => x.id === "PokedexProd");
    if (!dev || !prod) return fail(`Create two stacks from PokedexStack: "PokedexDev" and "PokedexProd". Found: ${r.stacks.map((x) => x.id).join(", ") || "none"}.`);
    const policy = (st: Cons) => {
      const res = r.synth(st).Resources[logicalId(["CardsBucket", "Resource"])];
      return { res, policy: res?.DeletionPolicy };
    };
    const d = policy(dev);
    const p = policy(prod);
    if (p.policy !== "Retain") return fail(`Production would delete its bucket (DeletionPolicy: ${String(p.policy)}) when the stack is deleted. In prod use ${c.p("removalPolicy")} RETAIN, chosen with ${c.L("isProd ? … : …", "… if is_prod else …")}.`, "DataLoss");
    if (byId(prod, "s3.Bucket", "CardsBucket")?.props.autoDeleteObjects === true) return fail(`Production must not auto-delete objects: ${c.p("autoDeleteObjects")} should be false in prod (it only works with DESTROY).`, "DataLoss");
    if (d.policy !== "Delete") return fail("Dev should stay disposable: use DESTROY with autoDeleteObjects so a dev stack can be torn down completely.");
    if (prod.props.terminationProtection !== true) return fail(`Protect production from accidental deletion: ${c.p("terminationProtection")}: ${c.L("true", "True")}.`);
    if (dev.props.terminationProtection === true) return fail("Dev doesn't need termination protection: it should be easy to delete.");
    const env = prod.props.env;
    if (!isRec(env) || env.region !== "ap-south-1") return fail(`Pin production to ap-south-1 with ${c.L('env: { region: "ap-south-1" }', 'env=cdk.Environment(region="ap-south-1")')}.`);
    for (const st of [dev, prod]) {
      const tags = (policy(st).res?.Properties as { Tags?: { Key: string; Value: string }[] } | undefined)?.Tags ?? [];
      if (!tags.some((t) => t.Key === "Project" && t.Value === "Pokedex")) return fail(`${st.id}'s bucket has no Project=Pokedex tag. Tag the whole app once: ${c.L('cdk.Tags.of(app).add("Project", "Pokedex")', 'cdk.Tags.of(app).add("Project", "Pokedex")')}.`);
    }
    return ok("Synthesized two stacks from one class. Dev's bucket is deleted with the stack; production's is retained.", data(c, [dev, prod]));
  },

  "quest-10": (c) => {
    const { r } = c;
    if (!r.assertions) return fail("Your test makes no assertions, so it can never fail. Add checks against the template.");
    const has = (_method: string, type: string, key: string, value?: string) =>
      r.assertionLog.some((a) => {
        if (a.type !== type || !["hasResourceProperties", "hasResource", "resourcePropertiesCountIs"].includes(a.method)) return false;
        if (a.method === "resourcePropertiesCountIs" && !(a.count && a.count > 0)) return false;
        let e = a.expected;
        if (e instanceof Matcher && (e.kind === "objectLike" || e.kind === "exact")) e = e.arg;
        if (a.method === "hasResource" && isRec(e) && isRec(e.Properties)) e = e.Properties;
        return isRec(e) && key in e && (value === undefined || JSON.stringify(e[key]).includes(value));
      });
    if (!has("hasResourceProperties", "AWS::S3::Bucket", "VersioningConfiguration", "Enabled")) {
      return fail(`Assert the bucket is versioned: template.${c.L("hasResourceProperties", "has_resource_properties")}("AWS::S3::Bucket", { VersioningConfiguration: { Status: "Enabled" } }).`);
    }
    if (!has("hasResourceProperties", "AWS::DynamoDB::Table", "BillingMode", "PAY_PER_REQUEST")) {
      return fail(`Assert the table is on demand: template.${c.L("hasResourceProperties", "has_resource_properties")}("AWS::DynamoDB::Table", { BillingMode: "PAY_PER_REQUEST" }).`);
    }
    if (!r.assertionLog.some((a) => a.method === "resourceCountIs" && a.type === "AWS::DynamoDB::Table" && a.count === 1)) {
      return fail(`Assert there is exactly one table: template.${c.L("resourceCountIs", "resource_count_is")}("AWS::DynamoDB::Table", 1).`);
    }
    const stack = r.stacks[0];
    return ok(`All ${r.assertionLog.length} assertions passed against the synthesized template. Nothing was deployed.`, { assertionsPassed: r.assertionLog.map((a) => `${a.method}(${a.type})`), ...(stack ? { template: r.synth(stack) } : {}) });
  },

  "quest-11": (c) => {
    const s = c.r.stacks[0];
    if (!s) return noStack(c);
    const wrappers = s.children.filter((x) => x.userClass === "SecureBucket");
    const names = wrappers.map((w) => w.id).sort().join(",");
    if (names !== "Cards,Sprites") return fail(`Use SecureBucket twice in the stack, with the ids "Cards" and "Sprites". Found: ${names || "none"}.`);
    for (const w of wrappers) {
      const inner = w.children.filter((x) => x.type === "s3.Bucket");
      if (inner.length !== 1) return fail(`${w.id} should contain exactly one bucket, created with ${c.L("this", "self")} as its scope.`);
      const pr = inner[0].props;
      if (pr.versioned !== true) return fail(`SecureBucket must turn on ${c.p("versioned")}.`);
      if (!is(pr.encryption, "s3.BucketEncryption.S3_MANAGED")) return fail(`SecureBucket must set ${c.p("encryption")}: s3.BucketEncryption.S3_MANAGED.`);
      if (!is(pr.blockPublicAccess, "s3.BlockPublicAccess.BLOCK_ALL")) return fail(`SecureBucket must set ${c.p("blockPublicAccess")}: s3.BlockPublicAccess.BLOCK_ALL.`);
      if (pr.enforceSSL !== true) return fail(`SecureBucket must set ${c.p("enforceSSL")}: ${c.L("true", "True")}.`);
    }
    const t = c.r.synth(s);
    return ok("Synthesized. Each SecureBucket made its own bucket, and the construct path (Cards/Bucket, Sprites/Bucket) keeps their logical IDs apart.", {
      logicalIds: Object.entries(t.Resources).filter(([, v]) => v.Type === "AWS::S3::Bucket").map(([k, v]) => `${k}  ←  ${String((v.Metadata as { "aws:cdk:path": string })["aws:cdk:path"])}`),
      template: t,
    });
  },
  "quest-12": (c) => {
    const { r } = c;
    const s = r.stacks.find((x) => byId(x, "dynamodb.Table", "PokedexTable") && byId(x, "s3.Bucket", "CardsBucket"));
    if (!s) return fail("Keep the table (PokedexTable) and the bucket (CardsBucket) from the starter.");
    const t = r.synth(s);
    const get = (...path: string[]) => t.Resources[logicalId(path)];
    const table = get("PokedexTable", "Resource");
    const bucket = get("CardsBucket", "Resource");
    if (!table || !bucket) return fail("Keep the table (PokedexTable) and the bucket (CardsBucket) from the starter.");
    if (table.DeletionPolicy !== "Retain") return fail(`The table would be deleted with the stack. Set ${c.p("removalPolicy")} to cdk.RemovalPolicy.RETAIN.`, "DataLoss");
    const tp = (table.Properties ?? {}) as Record<string, unknown>;
    if (tp.DeletionProtectionEnabled !== true) return fail(`Turn on ${c.p("deletionProtection")}: DynamoDB then refuses DeleteTable until it is switched off.`);
    if (!isRec(tp.PointInTimeRecoverySpecification) || tp.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled !== true) return fail(`Turn on point-in-time recovery with ${c.p("pointInTimeRecoverySpecification")}.`);
    if (bucket.DeletionPolicy !== "Retain") return fail(`The bucket would be deleted with the stack. Set ${c.p("removalPolicy")} to RETAIN.`, "DataLoss");
    if (get("CardsBucket", "AutoDeleteObjectsCustomResource", "Default")) return fail(`Production must not auto-delete objects. Remove ${c.p("autoDeleteObjects")}: it only works with DESTROY.`, "DataLoss");
    const bp = (bucket.Properties ?? {}) as Record<string, unknown>;
    if (!isRec(bp.VersioningConfiguration) || bp.VersioningConfiguration.Status !== "Enabled") return fail(`Version the bucket: ${c.p("versioned")}: ${c.L("true", "True")}.`);
    if (!get("CardsBucket", "Policy", "Resource")) return fail(`Refuse plain-HTTP requests with ${c.p("enforceSSL")}: ${c.L("true", "True")}.`);
    if (r.stacks.some((x) => x.props.terminationProtection !== true)) return fail(`Protect the stack from accidental deletion: ${c.p("terminationProtection")}: ${c.L("true", "True")}.`);
    return ok("Ready for launch: nothing the stack owns can be deleted by accident, and the data can be recovered.", data(c, [s]));
  },
};

export const checkedQuests = Object.keys(rules);

/** Real CDK APIs the simulator doesn't model: a "doesn't exist" error would be a lie, so say it is unsupported instead. */
const REAL_BUT_UNMODELLED = new Set([
  "role", "grantPrincipal", "grant_principal", "arnForObjects", "arn_for_objects", "resourceForPath", "resource_for_path",
  "addObjectRemovedNotification", "add_object_removed_notification",
  "format", "join", "addToResourcePolicy", "add_to_resource_policy", "metric", "grant", "addDependency", "add_dependency",
 "addLifecycleRule", "add_lifecycle_rule", "addCorsRule", "add_cors_rule",
]);

const MAX_NESTING = 60;

/** Cheap guard against pathological nesting before the recursive parsers see it. */
function nestingTooDeep(code: string): boolean {
  let depth = 0;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === "(" || ch === "[" || ch === "{") {
      if (++depth > MAX_NESTING) return true;
    } else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
  }
  for (const line of code.split("\n")) {
    const lead = /^[ \t]*/.exec(line)?.[0].length ?? 0;
    if (line.trim() && lead > 400) return true;
  }
  return false;
}

export function checkCdkQuest(questId: string, code: string, language: Language = "typescript"): CheckResult {
  const rule = Object.hasOwn(rules, questId) ? rules[questId] : undefined;
  if (!rule) return fail(`Unknown quest "${questId}".`);
  const lang: Language = language === "python" ? "python" : "typescript";
  if (nestingTooDeep(code)) return fail("This code is nested far deeper than any exercise needs, so the simulator stopped. Flatten it with a variable or two.", "LimitExceeded");
  const ctx = (r: RunResult): Ctx => ({
    lang,
    r,
    p: (camel) => (lang === "python" ? snake(camel) : camel),
    L: (ts, py) => (lang === "python" ? py : ts),
  });
  try {
    const parsed = lang === "python" ? parsePython(code) : parseTs(code);
    if (!parsed.ok) return fail(parsed.message, "SyntaxError");
    const r = new Interp(lang).run(parsed.stmts);
    const result = rule(ctx(r));
    const skipped = [...new Set(r.skipped.map((x) => x.what))];
    if (!result.success && skipped.length) {
      return { ...result, message: `${result.message}\n\nNote: the simulator doesn't run ${skipped.join(", ")}. If your resources are created inside one, write them out directly.` };
    }
    return result;
  } catch (error) {
    if (error instanceof SimError) {
      const bad = /(?:Property|attribute) '([^']+)'/.exec(error.message)?.[1];
      if ((error.code === "TS2339" || error.code === "AttributeError") && bad && REAL_BUT_UNMODELLED.has(bad)) {
        return fail(`'${bad}' is a real CDK API, but this simulator doesn't model it. Learn CDK covers what the quests need; try another way to write this.`, "Unsupported");
      }
      return fail(error.message, error.code);
    }
    if (error instanceof RangeError) return fail("The simulator stopped: this code is too deeply nested or too large.", "LimitExceeded");
    return fail(`The simulator couldn't read this code: ${error instanceof Error ? error.message : String(error)}`);
  }
}
