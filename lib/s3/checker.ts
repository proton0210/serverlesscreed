/**
 * Checks Learn S3 practice code without running it: acorn parses the source, the
 * literal arguments of `new XCommand({...})` (and a few helpers) are evaluated, and
 * each quest's rules decide the outcome. A successful check answers with the response
 * shape the real S3 API would return, from a small simulated bucket.
 *
 * Keep this file free of path aliases and JSX: scripts/check-s3.mjs imports it directly.
 */
import { parse } from "acorn";
import { createHash } from "node:crypto";

export type CheckResult = {
  success: boolean;
  message: string;
  /** The S3 error code the real API would return, when there is one. */
  error?: string;
  /** Simulated response (or a summary of several) on success. */
  data?: unknown;
};

type AnyNode = { type: string; [key: string]: unknown };

const UNKNOWN = Symbol("unknown");
type Value = unknown;

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

export const BUCKET = "hoenn-pokedex-media";

function walk(node: unknown, visit: (n: AnyNode) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, visit));
    return;
  }
  const n = node as AnyNode;
  if (typeof n.type === "string") visit(n);
  for (const [k, v] of Object.entries(n)) {
    if (k === "loc" || k === "start" || k === "end") continue;
    if (v && typeof v === "object") walk(v, visit);
  }
}

class Program {
  ast: AnyNode;
  consts = new Map<string, AnyNode>();

  constructor(code: string) {
    this.ast = parse(code, { ecmaVersion: "latest", sourceType: "module" }) as unknown as AnyNode;
    walk(this.ast, (n) => {
      if (n.type === "VariableDeclarator") {
        const id = n.id as AnyNode;
        if (id.type === "Identifier" && n.init) this.consts.set(id.name as string, n.init as AnyNode);
      }
    });
  }

  /** Evaluates literals, object/array literals, arithmetic, JSON.stringify and const references. */
  value(node: AnyNode | null | undefined, depth = 0): Value {
    if (!node || depth > 20) return UNKNOWN;
    switch (node.type) {
      case "Literal":
        return node.value;
      case "TemplateLiteral": {
        const quasis = node.quasis as AnyNode[];
        const exprs = node.expressions as AnyNode[];
        let out = "";
        for (let i = 0; i < quasis.length; i++) {
          out += ((quasis[i].value as { cooked: string }).cooked ?? "");
          if (i < exprs.length) {
            const v = this.value(exprs[i], depth + 1);
            // Unknown parts (function parameters) become placeholders, e.g. uploads/{trainerId}/sprite.png.
            if (v === UNKNOWN || (v && typeof v === "object")) out += exprs[i].type === "Identifier" ? `{${exprs[i].name as string}}` : "{…}";
            else out += String(v);
          }
        }
        return out;
      }
      case "Identifier": {
        if (node.name === "undefined") return undefined;
        const init = this.consts.get(node.name as string);
        return init ? this.value(init, depth + 1) : UNKNOWN;
      }
      case "UnaryExpression": {
        const v = this.value(node.argument as AnyNode, depth + 1);
        if (typeof v !== "number" && typeof v !== "boolean") return UNKNOWN;
        if (node.operator === "-") return -Number(v);
        if (node.operator === "+") return +Number(v);
        if (node.operator === "!") return !v;
        return UNKNOWN;
      }
      case "BinaryExpression": {
        const a = this.value(node.left as AnyNode, depth + 1);
        const b = this.value(node.right as AnyNode, depth + 1);
        if (node.operator === "+" && (typeof a === "string" || typeof b === "string") && a !== UNKNOWN && b !== UNKNOWN) return String(a) + String(b);
        if (typeof a !== "number" || typeof b !== "number") return UNKNOWN;
        switch (node.operator) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return a / b;
          case "**": return a ** b;
          default: return UNKNOWN;
        }
      }
      case "ArrayExpression":
        return (node.elements as (AnyNode | null)[]).map((e) => (e ? this.value(e, depth + 1) : undefined));
      case "ObjectExpression": {
        const out: Record<string, Value> = {};
        for (const p of node.properties as AnyNode[]) {
          if (p.type !== "Property") continue;
          const key = p.key as AnyNode;
          const name = p.computed ? this.value(key, depth + 1) : key.type === "Identifier" ? key.name : key.value;
          if (typeof name !== "string" && typeof name !== "number") continue;
          out[String(name)] = this.value(p.value as AnyNode, depth + 1);
        }
        return out;
      }
      case "CallExpression": {
        const callee = node.callee as AnyNode;
        if (callee.type === "MemberExpression" && (callee.object as AnyNode).name === "JSON" && (callee.property as AnyNode).name === "stringify") {
          const v = this.value((node.arguments as AnyNode[])[0], depth + 1);
          return containsUnknown(v) ? UNKNOWN : JSON.stringify(v);
        }
        return UNKNOWN;
      }
      default:
        return UNKNOWN;
    }
  }

  /** Arguments (evaluated) of every `new Name(...)`. */
  news(name: string): Value[][] {
    const out: Value[][] = [];
    walk(this.ast, (n) => {
      if (n.type === "NewExpression" && (n.callee as AnyNode).type === "Identifier" && (n.callee as AnyNode).name === name) {
        out.push((n.arguments as AnyNode[]).map((a) => this.value(a)));
      }
    });
    return out;
  }

  /** Raw argument nodes of every call to `name(...)`. */
  calls(name: string): AnyNode[][] {
    const out: AnyNode[][] = [];
    walk(this.ast, (n) => {
      if (n.type !== "CallExpression") return;
      const c = n.callee as AnyNode;
      const called = c.type === "Identifier" ? c.name : c.type === "MemberExpression" ? (c.property as AnyNode).name : undefined;
      if (called === name) out.push(n.arguments as AnyNode[]);
    });
    return out;
  }

  has(type: string, test: (n: AnyNode) => boolean = () => true) {
    let found = false;
    walk(this.ast, (n) => {
      if (!found && n.type === type && test(n)) found = true;
    });
    return found;
  }

  /** True when an identifier or property with this name appears anywhere. */
  mentions(name: string) {
    return this.has("Identifier", (n) => n.name === name);
  }
}

function containsUnknown(v: Value): boolean {
  if (v === UNKNOWN) return true;
  if (Array.isArray(v)) return v.some(containsUnknown);
  if (v && typeof v === "object") return Object.values(v).some(containsUnknown);
  return false;
}

type Obj = Record<string, Value>;
const isObj = (v: Value): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);

const ok = (message: string, data?: unknown): CheckResult => ({ success: true, message, data });
const fail = (message: string, error?: string): CheckResult => ({ success: false, message, error });
const meta = (httpStatusCode = 200) => ({ httpStatusCode, requestId: "SIM4Q8K2EXAMPLE", attempts: 1 });
const etag = (body: string) => `"${createHash("md5").update(body).digest("hex")}"`;

/** One command of `name`, with a literal object as its input. */
function single(p: Program, name: string): Obj | CheckResult {
  const all = p.news(name);
  if (all.length === 0) return fail(`Create the request with new ${name}({ ... }).`);
  const input = all[all.length - 1][0];
  if (!isObj(input)) return fail(`Pass ${name} an object literal, like new ${name}({ Bucket: "…" }).`);
  return input;
}
const isResult = (v: unknown): v is CheckResult => isObj(v) && typeof (v as CheckResult).success === "boolean";

function needBucket(input: Obj): CheckResult | null {
  if (input.Bucket === UNKNOWN) return fail(`Write the bucket name as a string: Bucket: "${BUCKET}".`);
  if (input.Bucket !== BUCKET) return fail(`NoSuchBucket: the Pokédex archive lives in "${BUCKET}", not "${String(input.Bucket)}".`, "NoSuchBucket");
  return null;
}

// ---------------------------------------------------------------------------
// Bucket naming rules (general purpose buckets)
// ---------------------------------------------------------------------------
export function bucketNameProblem(name: string): string | null {
  if (name.length < 3 || name.length > 63) return "Bucket names must be 3–63 characters long.";
  if (/[A-Z]/.test(name)) return "Bucket names can't contain uppercase letters.";
  if (/_/.test(name)) return "Bucket names can't contain underscores — use hyphens.";
  if (!/^[a-z0-9.-]+$/.test(name)) return "Use only lowercase letters, numbers, hyphens and dots.";
  if (!/^[a-z0-9]/.test(name) || !/[a-z0-9]$/.test(name)) return "Bucket names must begin and end with a letter or number.";
  if (/\.\./.test(name)) return "Bucket names can't contain two adjacent dots.";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return "Bucket names can't look like an IP address.";
  if (/^(xn--|sthree-|amzn-s3-demo-)/.test(name)) return "That prefix is reserved by AWS.";
  if (/(-s3alias|--ol-s3|\.mrap|--x-s3|--table-s3)$/.test(name)) return "That suffix is reserved by AWS.";
  return null;
}

/** Names someone else already owns in the simulated global namespace. */
const TAKEN = new Set(["pokedex", "hoenn-pokedex", "hoenn-pokedex-media", "pokemon", "pokedex-media", "sprites", "hoenn"]);

// ---------------------------------------------------------------------------
// Simulated data
// ---------------------------------------------------------------------------
const TREECKO = { number: 252, name: "Treecko", types: ["grass"], region: "Hoenn" };

/** 2,350 grass sprite frames: enough for three ListObjectsV2 pages. */
function grassSpriteKeys() {
  const species = ["0252-treecko", "0253-grovyle", "0254-sceptile", "0270-lotad", "0271-lombre", "0272-ludicolo", "0273-seedot", "0274-nuzleaf", "0275-shiftry", "0285-shroomish"];
  const keys: string[] = [];
  for (let i = 0; keys.length < 2350; i++) {
    const s = species[i % species.length];
    keys.push(`sprites/grass/${s}/frame-${String(Math.floor(i / species.length)).padStart(3, "0")}.png`);
  }
  return keys.sort();
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------
type Checker = (p: Program, code: string) => CheckResult;

const checks: Record<string, Checker> = {
  "quest-1": (p) => {
    const input = single(p, "CreateBucketCommand");
    if (isResult(input)) return input;
    const name = input.Bucket;
    if (typeof name !== "string") return fail("Give the bucket a name as a string: Bucket: \"…\".");
    const problem = bucketNameProblem(name);
    if (problem) return fail(`InvalidBucketName: "${name}". ${problem}`, "InvalidBucketName");
    if (TAKEN.has(name)) return fail(`BucketAlreadyExists: another AWS account already owns "${name}". Bucket names are global — add something unique, like your team name or a random suffix.`, "BucketAlreadyExists");
    const cfg = input.CreateBucketConfiguration;
    const loc = isObj(cfg) ? cfg.LocationConstraint : undefined;
    if (loc === undefined) return fail("IllegalLocationConstraintException: the client sends to ap-south-1, so S3 needs CreateBucketConfiguration: { LocationConstraint: \"ap-south-1\" }. Only us-east-1 may omit it.", "IllegalLocationConstraintException");
    if (loc !== "ap-south-1") return fail(`IllegalLocationConstraintException: the request went to ap-south-1 but asked for "${String(loc)}". Match the client's Region.`, "IllegalLocationConstraintException");
    return ok(`Bucket "${name}" created in Asia Pacific (Mumbai).`, { $metadata: meta(), Location: `http://${name}.s3.amazonaws.com/` });
  },

  "quest-2": (p) => {
    const input = single(p, "PutObjectCommand");
    if (isResult(input)) return input;
    const b = needBucket(input);
    if (b) return b;
    if (input.Key !== "cards/0252-treecko.json") return fail(`Store the card at Key: "cards/0252-treecko.json" (got ${JSON.stringify(input.Key === UNKNOWN ? "a variable" : input.Key)}).`);
    if (input.Body === undefined) return fail("Add the card as the Body — JSON.stringify(card).");
    if (input.ContentType !== "application/json") return fail("Set ContentType: \"application/json\". Without it S3 stores binary/octet-stream, and browsers download the card instead of showing it.");
    const md = input.Metadata;
    if (!isObj(md)) return fail("Add user metadata: Metadata: { generation: \"3\" }.");
    for (const [k, v] of Object.entries(md)) {
      if (typeof v !== "string") return fail(`Metadata values must be strings — write ${k}: "${String(v === UNKNOWN ? "…" : v)}".`);
      if (k !== k.toLowerCase()) return fail(`S3 stores user-metadata keys in lowercase (x-amz-meta-${k.toLowerCase()}). Use lowercase keys to avoid surprises.`);
    }
    if (md.generation !== "3") return fail("Treecko is from generation 3: Metadata: { generation: \"3\" }.");
    const body = typeof input.Body === "string" ? input.Body : JSON.stringify(TREECKO);
    return ok("Card stored. Any read from now on sees it — S3 is strongly consistent for reads after writes.", {
      $metadata: meta(),
      ETag: etag(body),
      ChecksumCRC32: "SIMcrc==",
      ServerSideEncryption: "AES256",
    });
  },

  "quest-3": (p) => {
    const input = single(p, "GetObjectCommand");
    if (isResult(input)) return input;
    const b = needBucket(input);
    if (b) return b;
    if (typeof input.Key === "string" && input.Key.toLowerCase() === "cards/0252-treecko.json" && input.Key !== "cards/0252-treecko.json")
      return fail(`NoSuchKey: keys are case-sensitive. "${input.Key}" is not "cards/0252-treecko.json".`, "NoSuchKey");
    if (input.Key !== "cards/0252-treecko.json") return fail("NoSuchKey: read Key: \"cards/0252-treecko.json\".", "NoSuchKey");
    if (p.calls("transformToString").length === 0) return fail("Body is a stream, not text. Read it with await response.Body.transformToString().");
    if (p.calls("parse").length === 0) return fail("transformToString() gives you text. Turn it into an object with JSON.parse(…).");
    const body = JSON.stringify(TREECKO);
    return ok("Treecko's card is back.", {
      $metadata: meta(),
      ContentType: "application/json",
      ContentLength: Buffer.byteLength(body),
      ETag: etag(body),
      Metadata: { generation: "3" },
      card: TREECKO,
    });
  },

  "quest-4": (p) => {
    // The SDK paginator (shown in the lesson) does the ContinuationToken loop itself.
    const paginator = p.calls("paginateListObjectsV2").map((args) => p.value(args[1])).find(isObj);
    if (paginator) {
      const b = needBucket(paginator);
      if (b) return b;
      if (paginator.Prefix === "sprites/grass") return fail("Almost: \"sprites/grass\" also matches keys like \"sprites/grass-old/…\". End the prefix with the delimiter: \"sprites/grass/\".");
      if (paginator.Prefix !== "sprites/grass/") return fail("List only grass sprites with Prefix: \"sprites/grass/\".");
      return ok("Listed all 2,350 grass sprites in 3 pages — the paginator followed NextContinuationToken for you.", { pages: 3, total: 2350 });
    }
    const input = single(p, "ListObjectsV2Command");
    if (isResult(input)) return input;
    const b = needBucket(input);
    if (b) return b;
    if (input.Prefix === "sprites/grass") return fail("Almost: \"sprites/grass\" also matches keys like \"sprites/grass-old/…\". End the prefix with the delimiter: \"sprites/grass/\".");
    if (input.Prefix !== "sprites/grass/") return fail("List only grass sprites with Prefix: \"sprites/grass/\".");
    if (!("ContinuationToken" in input)) return fail("Only the first 1,000 keys came back. Pass ContinuationToken: token so each request continues where the last one stopped.");
    if (!p.mentions("NextContinuationToken")) return fail("Set token = page.NextContinuationToken after each page.");
    const looped = p.has("DoWhileStatement") || p.has("WhileStatement") || p.has("ForStatement");
    if (!looped) return fail("Keep requesting pages in a loop until IsTruncated is false (or there's no NextContinuationToken).");
    if (typeof input.MaxKeys === "number" && input.MaxKeys > 1000) return fail("MaxKeys above 1,000 is ignored — S3 never returns more than 1,000 keys per page.");
    const keys = grassSpriteKeys();
    const size = typeof input.MaxKeys === "number" && input.MaxKeys > 0 ? input.MaxKeys : 1000;
    const pages = [];
    for (let i = 0; i < keys.length; i += size) pages.push(keys.slice(i, i + size));
    return ok(`Listed all ${keys.length.toLocaleString("en-US")} grass sprites in ${pages.length} pages.`, {
      pages: pages.map((pg, i) => ({ KeyCount: pg.length, IsTruncated: i < pages.length - 1, first: pg[0], last: pg[pg.length - 1] })),
      total: keys.length,
    });
  },

  "quest-5": (p) => {
    const input = single(p, "PutObjectCommand");
    if (isResult(input)) return input;
    const b = needBucket(input);
    if (b) return b;
    const cls = input.StorageClass;
    const why: Record<string, string> = {
      STANDARD: "STANDARD works, but you pay the highest storage price for replays that are read a few times a year.",
      STANDARD_IA: "STANDARD_IA is built for data read about once a month; for a few reads a year Glacier Instant Retrieval stores it for less and still returns it in milliseconds.",
      ONEZONE_IA: "ONEZONE_IA keeps data in one Availability Zone. Tournament replays can't be recreated, so they need a class that spans at least three AZs.",
      GLACIER: "GLACIER (Flexible Retrieval) needs a restore that takes minutes to hours before anyone can watch the replay — InvalidObjectState on GetObject until then.",
      DEEP_ARCHIVE: "DEEP_ARCHIVE restores take up to 12 hours (48 for bulk). Viewers can't wait that long.",
      REDUCED_REDUNDANCY: "REDUCED_REDUNDANCY is a legacy class AWS recommends against.",
      EXPRESS_ONEZONE: "S3 Express One Zone uses directory buckets and is built for low-latency hot data, not a long-term archive.",
    };
    if (cls === undefined) return fail("No StorageClass means STANDARD. Pick the class that fits: read a few times a year, must play instantly, kept for years.");
    if (cls === "GLACIER_IR")
      return ok("Replay stored in Glacier Instant Retrieval: the lowest storage price for rarely read data, still returned in milliseconds.", {
        $metadata: meta(),
        ETag: etag("replay"),
        StorageClass: "GLACIER_IR",
        note: "Minimum storage duration 90 days; per-GB retrieval charge on each read.",
      });
    if (cls === "INTELLIGENT_TIERING")
      return ok("Intelligent-Tiering works: it moves the replay to cheaper access tiers on its own. For a pattern you already know, GLACIER_IR avoids the per-object monitoring fee.", {
        $metadata: meta(),
        StorageClass: "INTELLIGENT_TIERING",
      });
    if (typeof cls === "string" && why[cls]) return fail(why[cls]);
    return fail(`InvalidStorageClass: "${String(cls)}" isn't an S3 storage class.`, "InvalidStorageClass");
  },

  "quest-6": (p) => {
    const input = single(p, "PutObjectCommand");
    if (isResult(input)) return input;
    const b = needBucket(input);
    if (b) return b;
    if (input.Key !== "cards/0258-mudkip.json") return fail("Write Mudkip's card to Key: \"cards/0258-mudkip.json\".");
    if (input.IfNoneMatch === undefined && input.IfMatch === undefined)
      return fail("Silent overwrite: a teammate uploaded Mudkip's card a moment ago and this PUT replaced it. Add IfNoneMatch: \"*\" so the write only succeeds when the key doesn't exist yet.");
    if (input.IfMatch !== undefined && input.IfNoneMatch === undefined)
      return fail("IfMatch protects updates to a version you've read. Here you're creating a card, so use IfNoneMatch: \"*\".");
    if (input.IfNoneMatch !== "*") return fail("For PutObject, IfNoneMatch only accepts \"*\" (\"only if no object has this key\").", "NotImplemented");
    if (!p.has("Literal", (n) => n.value === "PreconditionFailed" || n.value === 412)) return fail("S3 will answer 412 PreconditionFailed when the card exists. Catch it (err.name === \"PreconditionFailed\") and tell the trainer instead of crashing.");
    return ok("S3 refused the write with 412 PreconditionFailed, so your teammate's card is safe — and your code handled it.", {
      $metadata: meta(412),
      name: "PreconditionFailed",
      message: "At least one of the pre-conditions you specified did not hold",
      existing: { Key: "cards/0258-mudkip.json", VersionId: "3HL4kqtJlcpXroDTDmJ.rmSpXd3dIbrHY" },
    });
  },

  "quest-7": (p) => {
    const calls = p.calls("getSignedUrl");
    if (calls.length === 0) return fail("Create the URL with getSignedUrl(client, command, { expiresIn }) from @aws-sdk/s3-request-presigner.");
    const [, cmdNode, optsNode] = calls[calls.length - 1];
    let command: { name: string; input: Value } | null = null;
    const resolved = cmdNode?.type === "Identifier" ? (p.consts.get(cmdNode.name as string) ?? cmdNode) : cmdNode;
    if (resolved?.type === "NewExpression") {
      command = { name: (resolved.callee as AnyNode).name as string, input: p.value((resolved.arguments as AnyNode[])[0]) };
    }
    if (!command) return fail("Pass the command itself as the second argument, e.g. new PutObjectCommand({ … }).");
    if (command.name === "GetObjectCommand") return fail("This URL would let trainers download, not upload. Sign a PutObjectCommand.");
    if (command.name !== "PutObjectCommand") return fail(`Sign a PutObjectCommand (got ${command.name}).`);
    const input = command.input;
    if (!isObj(input)) return fail("Give PutObjectCommand an object literal.");
    const b = needBucket(input);
    if (b) return b;
    if (typeof input.Key !== "string" || !input.Key.startsWith("uploads/")) return fail("Keep trainer uploads apart from curated files: use a Key under \"uploads/\".");
    if (input.ContentType !== "image/png") return fail("Sign ContentType: \"image/png\" too, so the browser must send a PNG for the signature to match.");
    const opts = optsNode ? p.value(optsNode) : undefined;
    const exp = isObj(opts) ? opts.expiresIn : undefined;
    if (exp === undefined) return fail("Without expiresIn the URL lasts 900 seconds (15 minutes). Set it explicitly: { expiresIn: 300 }.");
    if (typeof exp !== "number") return fail("expiresIn is a number of seconds, like 300.");
    if (exp > 604800) return fail("AuthorizationQueryParametersError: Signature Version 4 presigned URLs can't last longer than 604,800 seconds (7 days).", "AuthorizationQueryParametersError");
    if (exp > 900) return fail(`${exp.toLocaleString("en-US")} seconds is far longer than an upload takes. Anyone holding the link can use it until then — keep it to a few minutes (300).`);
    if (exp < 30) return fail("That's too short for a trainer to pick a file and upload it. Try 300 seconds.");
    const sig = createHash("sha256").update(`${input.Key}:${exp}`).digest("hex");
    return ok(`Upload URL ready for ${exp / 60} minute${exp === 60 ? "" : "s"}. Anyone with the URL can PUT this one key until it expires.`, {
      url:
        `https://${BUCKET}.s3.ap-south-1.amazonaws.com/${input.Key}` +
        `?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAEXAMPLE%2F20260926%2Fap-south-1%2Fs3%2Faws4_request` +
        `&X-Amz-Date=20260926T090000Z&X-Amz-Expires=${exp}&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=${sig}`,
      method: "PUT",
      headers: { "Content-Type": "image/png" },
    });
  },

  "quest-8": (p) => {
    const all = p.news("Upload");
    if (all.length === 0) return fail("Use new Upload({ client, params, partSize, queueSize }) from @aws-sdk/lib-storage.");
    const opts = all[all.length - 1][0];
    if (!isObj(opts)) return fail("Pass Upload an object literal.");
    const params = opts.params;
    if (!isObj(params)) return fail("Put Bucket, Key and Body inside params: { … }.");
    const b = needBucket(params);
    if (b) return b;
    const size = p.value(p.consts.get("replaySizeBytes"));
    const total = typeof size === "number" ? size : 80 * GiB;
    const part = opts.partSize;
    if (part === undefined) return fail("lib-storage defaults to 5 MiB parts. For an 80 GiB replay that's 16,384 parts — more than the 10,000 allowed. Set partSize.");
    if (typeof part !== "number") return fail("partSize is a number of bytes, e.g. 16 * 1024 * 1024.");
    if (part < 5 * MiB) return fail(`EntityTooSmall: every part except the last must be at least 5 MiB (you chose ${(part / MiB).toFixed(1)} MiB).`, "EntityTooSmall");
    if (part > 5 * GiB) return fail("EntityTooLarge: a single part can be at most 5 GiB.", "EntityTooLarge");
    const parts = Math.ceil(total / part);
    if (parts > 10000) return fail(`InvalidArgument: ${(part / MiB).toFixed(0)} MiB parts would need ${parts.toLocaleString("en-US")} parts; a multipart upload allows at most 10,000. Use at least ${Math.ceil(total / 10000 / MiB)} MiB.`, "InvalidArgument");
    const q = opts.queueSize;
    if (q !== undefined && (typeof q !== "number" || q < 1)) return fail("queueSize is how many parts upload in parallel — a small positive number like 4.");
    if (opts.leavePartsOnError === true) return fail("leavePartsOnError: true keeps every uploaded part when the upload fails — invisible in listings, but billed until someone aborts the upload. Remove it (the default, false, aborts and cleans up).");
    if (!p.calls("done").length) return fail("Start the upload and wait for it with await upload.done().");
    return ok(`Replay uploaded in ${parts.toLocaleString("en-US")} parts of ${(part / MiB).toFixed(0)} MiB, ${typeof q === "number" ? q : 4} at a time.`, {
      $metadata: meta(),
      Bucket: BUCKET,
      Key: params.Key,
      Location: `https://${BUCKET}.s3.ap-south-1.amazonaws.com/${String(params.Key)}`,
      ETag: `"${createHash("md5").update(String(parts)).digest("hex")}-${parts}"`,
    });
  },

  "quest-9": (p) => {
    const input = single(p, "PutBucketLifecycleConfigurationCommand");
    if (isResult(input)) return input;
    const b = needBucket(input);
    if (b) return b;
    const rules = isObj(input.LifecycleConfiguration) ? input.LifecycleConfiguration.Rules : undefined;
    if (!Array.isArray(rules) || rules.length === 0) return fail("Add LifecycleConfiguration: { Rules: [ … ] }.");
    const rule = rules.find((r) => isObj(r) && isObj(r.Filter) && r.Filter.Prefix === "replays/");
    if (!isObj(rule)) return fail("Scope the rule to replays only: Filter: { Prefix: \"replays/\" }.");
    if (rule.Status !== "Enabled") return fail("MalformedXML: Status must be \"Enabled\" (or \"Disabled\" to pause the rule).", "MalformedXML");
    const tr = Array.isArray(rule.Transitions) ? rule.Transitions : [];
    const ia = tr.find((t) => isObj(t) && t.StorageClass === "STANDARD_IA");
    if (!isObj(ia)) return fail("Move replays to STANDARD_IA with Transitions: [{ Days: 30, StorageClass: \"STANDARD_IA\" }].");
    if (typeof ia.Days !== "number" || ia.Days < 30) return fail(`InvalidArgument: 'Days' in the Transition action must be at least 30 for STANDARD_IA (got ${String(ia.Days)}).`, "InvalidArgument");
    if (ia.Days !== 30) return fail("The team asked for the move at 30 days.");
    const exp = rule.Expiration;
    if (!isObj(exp) || exp.Days !== 365) return fail("Delete replays after a year: Expiration: { Days: 365 }.");
    const abort = rule.AbortIncompleteMultipartUpload;
    if (!isObj(abort) || typeof abort.DaysAfterInitiation !== "number") return fail("Clean up failed uploads too: AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }. Their parts are billed until then.");
    if (abort.DaysAfterInitiation > 30) return fail("Parts of failed uploads are billed until they're aborted — use a few days, like 7.");
    return ok("Lifecycle rule saved. S3 applies it asynchronously, once a day.", {
      $metadata: meta(),
      timeline: [
        { day: 0, event: "Uploaded to STANDARD" },
        { day: abort.DaysAfterInitiation, event: "Unfinished multipart uploads aborted" },
        { day: 30, event: "Transitioned to STANDARD_IA" },
        { day: 365, event: "Expired (deleted)" },
      ],
    });
  },

  "quest-10": (p) => {
    const input = single(p, "PutBucketPolicyCommand");
    if (isResult(input)) return input;
    const b = needBucket(input);
    if (b) return b;
    if (typeof input.Policy !== "string") return fail("Policy must be a JSON string: Policy: JSON.stringify(policy).");
    let doc: Obj;
    try {
      doc = JSON.parse(input.Policy);
    } catch {
      return fail("MalformedPolicy: the policy isn't valid JSON.", "MalformedPolicy");
    }
    if (doc.Version !== "2012-10-17") return fail("MalformedPolicy: use Version: \"2012-10-17\" (the current policy language).", "MalformedPolicy");
    const stmts = Array.isArray(doc.Statement) ? doc.Statement.filter(isObj) : isObj(doc.Statement) ? [doc.Statement] : [];
    if (!stmts.length) return fail("MalformedPolicy: add at least one Statement.", "MalformedPolicy");
    const everyone = (pr: Value) => pr === "*" || (isObj(pr) && (pr.AWS === "*" || (Array.isArray(pr.AWS) && pr.AWS.includes("*"))));
    const publicAllow = stmts.find((s) => s.Effect === "Allow" && everyone(s.Principal) && !s.Condition);
    if (publicAllow)
      return fail("AccessDenied: this statement lets anyone on the internet read the archive, and Block Public Access (BlockPublicPolicy) rejects public policies. Remove it.", "AccessDenied");
    const arn = `arn:aws:s3:::${BUCKET}`;
    const tls = stmts.find((s) => {
      const cond = isObj(s.Condition) ? s.Condition.Bool : undefined;
      const v = isObj(cond) ? cond["aws:SecureTransport"] : undefined;
      return s.Effect === "Deny" && everyone(s.Principal) && (v === "false" || v === false);
    });
    if (!tls) return fail("Add a statement that denies every request made without TLS: Effect \"Deny\", Principal \"*\", Condition { Bool: { \"aws:SecureTransport\": \"false\" } }.");
    const actions = ([] as Value[]).concat(tls.Action as Value);
    if (!actions.includes("s3:*")) return fail("Deny all S3 actions over plain HTTP: Action: \"s3:*\".");
    const res = ([] as Value[]).concat(tls.Resource as Value);
    if (!res.includes(arn) || !res.includes(`${arn}/*`)) return fail(`Cover the bucket and its objects: Resource: ["${arn}", "${arn}/*"].`);
    return ok("Policy saved. Requests without TLS are denied, and nothing in it makes the bucket public.", {
      $metadata: meta(204),
      effective: { BlockPublicAccess: "all four settings on", ObjectOwnership: "BucketOwnerEnforced (ACLs disabled)", DefaultEncryption: "SSE-S3", SSE_C: "blocked by default" },
    });
  },

  "quest-11": (p) => {
    const input = single(p, "PutBucketNotificationConfigurationCommand");
    if (isResult(input)) return input;
    const b = needBucket(input);
    if (b) return b;
    const cfg = input.NotificationConfiguration;
    const fns = isObj(cfg) && Array.isArray(cfg.LambdaFunctionConfigurations) ? cfg.LambdaFunctionConfigurations.filter(isObj) : [];
    if (!fns.length) return fail("Add NotificationConfiguration: { LambdaFunctionConfigurations: [ … ] }.");
    const fn = fns[0];
    if (typeof fn.LambdaFunctionArn !== "string" || !fn.LambdaFunctionArn.startsWith("arn:aws:lambda:")) return fail("Point LambdaFunctionArn at the thumbnail function's ARN.");
    const events = Array.isArray(fn.Events) ? fn.Events : [];
    if (!events.some((e) => e === "s3:ObjectCreated:*" || e === "s3:ObjectCreated:Put")) return fail("Trigger on new objects: Events: [\"s3:ObjectCreated:*\"].");
    const rules = isObj(fn.Filter) && isObj(fn.Filter.Key) && Array.isArray(fn.Filter.Key.FilterRules) ? fn.Filter.Key.FilterRules.filter(isObj) : [];
    const prefix = rules.find((r) => String(r.Name).toLowerCase() === "prefix")?.Value;
    const suffix = rules.find((r) => String(r.Name).toLowerCase() === "suffix")?.Value;
    const matches = (key: string) => (typeof prefix !== "string" || key.startsWith(prefix)) && (typeof suffix !== "string" || key.endsWith(suffix));
    if (matches("sprites/thumbs/0252-treecko.png"))
      return fail("Infinite loop: the function writes thumbnails to sprites/thumbs/, and each thumbnail matches this filter and triggers the function again. Narrow the filter to originals only.");
    if (!matches("sprites/originals/0252-treecko.png")) return fail("New originals like sprites/originals/0252-treecko.png must still trigger the function.");
    if (matches("sprites/originals/0252-treecko.json")) return fail("Only PNGs need thumbnails. Add a suffix rule: { Name: \"suffix\", Value: \".png\" }.");
    return ok("Notification saved. New PNGs under sprites/originals/ invoke the function; its thumbnails don't.", {
      $metadata: meta(),
      sampleEvent: {
        eventSource: "aws:s3",
        eventName: "ObjectCreated:Put",
        s3: { bucket: { name: BUCKET }, object: { key: "sprites/originals/0252-treecko.png", size: 18342, sequencer: "0066F4B1C2D3E4F5A6" } },
      },
    });
  },
};

export const checkedQuests = Object.keys(checks);

export function checkS3Quest(questId: string, code: string): CheckResult {
  const check = checks[questId];
  if (!check) return fail(`Unknown quest "${questId}".`);
  let program: Program;
  try {
    program = new Program(code);
  } catch (error) {
    return fail(`Syntax error: ${error instanceof Error ? error.message : "invalid JavaScript"}`);
  }
  try {
    return check(program, code);
  } catch (error) {
    return fail(`The simulator couldn't read this code: ${error instanceof Error ? error.message : String(error)}`);
  }
}
