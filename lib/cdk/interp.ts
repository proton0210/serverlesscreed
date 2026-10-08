/**
 * Runs a parsed CDK app in a sandbox of plain values: no code is executed and nothing touches AWS.
 * Imports, classes, constructors, `super()`, conditionals and the supported aws-cdk-lib constructs are modelled;
 * the result is a tree of constructs that synth.ts turns into CloudFormation.
 * Keep this file free of path aliases and JSX: scripts/check-cdk-unit.mjs imports it directly.
 */
import type { Language, Node, Param, Stmt } from "./ir.ts";
import {
  BUCKET_PUT, BUCKET_READ, BUCKET_WRITE, ENUMS, PROP_ENUMS, RUNTIME_NAMES, SPECS, TABLE_READ, TABLE_WRITE,
  camel, canon, isModuleName, moduleKey, moduleName, snake,
} from "./catalog.ts";
import {
  Cons, Dur, Env, Fn, HOST, Host, Matcher, Mod, PathVal, ResourceVal, SimError, Size, TagsVal, Tok, UNKNOWN, UserClass, ValueObj, isRec,
} from "./model.ts";
import type { Rec } from "./model.ts";
import { countByType, matches, resourcesOf, synthesize } from "./synth.ts";
import type { Template } from "./synth.ts";

type Args = { pos: unknown[]; kw: Rec; explicit: Set<string> };

export class TemplateVal {
  stack: Cons;
  template: Template;
  constructor(stack: Cons, template: Template) {
    this.stack = stack;
    this.template = template;
  }
}

export type RunResult = {
  app: Cons | null;
  stacks: Cons[];
  all: Cons[];
  tokens: Tok[];
  assertions: number;
  /** Every assertion that passed, in order. */
  assertionLog: { method: string; type: string; expected: unknown; count?: number }[];
  skipped: { what: string; line: number }[];
  synth: (stack: Cons) => Template;
};

const HOST_NAMES = new Set([
  "console", "process", "Math", "JSON", "Object", "Array", "String", "Number", "Boolean", "require", "module", "exports", "print", "len", "str", "int", "range",
  "os", "sys", "__dirname", "__filename", "__file__", "expect", "jest", "describe", "test", "it", "beforeEach", "afterEach", "beforeAll", "afterAll", "pytest", "Path",
  "path", "fs", "Error", "Date", "dict", "list", "isinstance", "getattr", "open", "json",
]);

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "ANY"]);

const ATTRS: Record<string, string[]> = {
  "s3.Bucket": ["bucketName", "bucketArn", "bucketDomainName", "bucketWebsiteUrl"],
  "dynamodb.Table": ["tableName", "tableArn", "tableStreamArn"],
  "lambda.Function": ["functionName", "functionArn"],
  "apigateway.RestApi": ["restApiId", "url"],
  "apigateway.LambdaRestApi": ["restApiId", "url"],
  "core.Stack": ["stackName", "region", "account", "stackId"],
};

const MAX_STEPS = 50_000;

export class Interp {
  lang: Language;
  all: Cons[] = [];
  tokens: Tok[] = [];
  assertions = 0;
  assertionLog: RunResult["assertionLog"] = [];
  skipped: { what: string; line: number }[] = [];
  global = new Env(null);
  tests: Fn[] = [];
  steps = 0;
  depth = 0;
  classes = new Map<string, UserClass>();

  constructor(lang: Language) {
    this.lang = lang;
  }

  get py() {
    return this.lang === "python";
  }

  run(stmts: Stmt[]): RunResult {
    this.global.set("__name__", "__main__");
    this.exec(stmts, this.global);
    for (const t of this.tests) this.callFn(t, { pos: [], kw: {}, explicit: new Set() });
    return {
      app: this.all.find((c) => c.type === "core.App") ?? null,
      stacks: this.all.filter((c) => c.type === "core.Stack" && c.ready),
      all: this.all,
      tokens: this.tokens,
      assertions: this.assertions,
      assertionLog: this.assertionLog,
      skipped: this.skipped,
      synth: (stack) => synthesize(stack, this.tokens),
    };
  }

  err(ts: string, py: string, code: string): SimError {
    return new SimError(this.py ? py : ts, code);
  }

  tick() {
    if (++this.steps > MAX_STEPS) throw new SimError("The simulator stopped: this code does far more work than any exercise needs. Check for runaway recursion.", "LimitExceeded");
  }

  /* ── statements ─────────────────────────────────────────────────────────── */

  exec(stmts: Stmt[], env: Env): { ret: unknown; jump?: "break" | "continue" } | null {
    for (const s of stmts) {
      this.tick();
      try {
        switch (s.t) {
          case "import": {
            const key = moduleKey(s.module);
            if (s.alias) env.set(s.alias, key ? new Mod(key) : HOST);
            for (const [orig, local] of s.names) env.set(local, !key ? HOST : isModuleName(orig) ? new Mod(moduleName(orig)) : new PathVal(`${key}.${orig}`));
            break;
          }
          case "class": {
            const base = s.base ? this.ev(s.base, env) : undefined;
            const uc = new UserClass(s.name, base, s.params, s.ctor, env, s.line);
            for (const m of s.methods ?? []) uc.methods.set(m.name, { params: m.params, body: m.body });
            this.classes.set(s.name, uc);
            env.set(s.name, uc);
            break;
          }
          case "def": {
            const fn = new Fn(s.name, s.params, s.body, env);
            env.set(s.name, fn);
            if (env === this.global && s.name.startsWith("test")) this.tests.push(fn);
            break;
          }
          case "assign":
            this.assign(s.target, this.ev(s.value, env), env);
            break;
          case "destructure": {
            const v = this.ev(s.value, env);
            for (const [orig, local] of s.names) env.set(local, isRec(v) ? v[orig] : UNKNOWN);
            break;
          }
          case "expr":
            this.ev(s.value, env);
            break;
          case "if": {
            const r = this.exec(this.truthy(this.ev(s.cond, env)) ? s.then : s.else, env);
            if (r) return r;
            break;
          }
          case "return":
            return { ret: s.value ? this.ev(s.value, env) : undefined };
          case "throw":
            throw new SimError(this.py ? "Exception: the program raised an error, so `cdk synth` would fail here." : "Error: the program threw, so `cdk synth` would fail here.", "ProgramError");
          case "jump":
            return { ret: undefined, jump: s.kind };
          case "for": {
            const items = this.ev(s.iter, env);
            if (!Array.isArray(items)) {
              this.skipped.push({ what: "loops over values it can't read", line: s.line });
              break;
            }
            if (items.length > 200) throw new SimError("The simulator stopped: this loop runs far more times than any exercise needs.", "LimitExceeded");
            for (const item of items) {
              // Python's loop variable lives on after the loop; TypeScript's `const x` stays inside it.
              const scope = this.py ? env : new Env(env);
              scope.set(s.variable, item);
              const r = this.exec(s.body, scope);
              if (r?.jump === "break") break;
              if (r?.jump === "continue") continue;
              if (r) return r;
            }
            break;
          }
          case "skip":
            this.skipped.push({ what: s.what, line: s.line });
            break;
        }
      } catch (e) {
        if (e instanceof SimError && !/\(line \d+\)\s*$/.test(e.message)) e.message += ` (line ${s.line})`;
        throw e;
      }
    }
    return null;
  }

  assign(target: Node, v: unknown, env: Env) {
    if (target.t === "id") env.set(target.name, v);
    else if (target.t === "mem") {
      const obj = this.ev(target.obj, env);
      if (obj instanceof Cons) obj.fields.set(target.prop, v);
      else if (isRec(obj)) obj[target.prop] = v;
    }
  }

  /* ── expressions ────────────────────────────────────────────────────────── */

  ev(n: Node, env: Env): unknown {
    this.tick();
    switch (n.t) {
      case "lit":
        if (typeof n.v === "string" && /[\u0001\u0002]/.test(n.v)) throw new SimError("This string contains control characters the simulator reserves.", "Unsupported");
        return n.v;
      case "unknown":
        return UNKNOWN;
      case "arr":
        return this.bounded(n.items.map((i) => this.ev(i, env)));
      case "obj": {
        const out: Rec = {};
        for (const [k, v] of n.entries) {
          if (k === null) {
            const s = this.ev(v, env);
            if (isRec(s)) Object.assign(out, s);
          } else out[k] = this.ev(v, env);
        }
        return this.bounded(out);
      }
      case "idx": {
        const o = this.ev(n.obj, env);
        const i = this.ev(n.index, env);
        if (Array.isArray(o) && typeof i === "number" && Number.isInteger(i)) {
          const at = this.py && i < 0 ? o.length + i : i;
          if (at < 0 || at >= o.length) throw this.err("error TS2493: Tuple type has no element at this index.", "IndexError: list index out of range", this.py ? "IndexError" : "TS2493");
          return o[at];
        }
        if (isRec(o) && typeof i === "string") return Object.hasOwn(o, i) ? o[i] : undefined;
        return UNKNOWN;
      }
      case "id":
        return this.ident(n.name, env);
      case "mem":
        return this.member(this.ev(n.obj, env), n.prop);
      case "call":
        return this.call(n, env);
      case "tpl": {
        let s = "";
        for (const p of n.parts) s += typeof p === "string" ? p : this.str(this.ev(p, env));
        return s;
      }
      case "bin":
        return this.binary(n, env);
      case "un": {
        const v = this.ev(n.e, env);
        if (v === UNKNOWN) return UNKNOWN;
        if (n.op === "!") return !this.truthy(v);
        if (typeof v !== "number") return UNKNOWN;
        return n.op === "-" ? -v : v;
      }
      case "cond":
        return this.truthy(this.ev(n.c, env)) ? this.ev(n.a, env) : this.ev(n.b, env);
      case "fn":
        return new Fn("(anonymous)", n.params, n.body, env);
    }
  }

  ident(name: string, env: Env): unknown {
    if (env.has(name)) return env.get(name);
    if (HOST_NAMES.has(name)) return HOST;
    throw this.err(`error TS2304: Cannot find name '${name}'.`, `NameError: name '${name}' is not defined`, this.py ? "NameError" : "TS2304");
  }

  truthy(v: unknown): boolean {
    if (v === UNKNOWN || v === HOST) throw new SimError("The simulator can't tell whether this condition is true. Compare plain values it can read (strings, numbers, props).", "Unsupported");
    if (Array.isArray(v)) return this.py ? v.length > 0 : true;
    if (isRec(v) && this.py) return Object.keys(v).length > 0;
    return Boolean(v);
  }

  str(v: unknown): string {
    if (typeof v === "string") return v;
    if (v === null) return this.py ? "None" : "null";
    if (v === undefined) return this.py ? "None" : "undefined";
    if (typeof v === "boolean") return this.py ? (v ? "True" : "False") : String(v);
    if (typeof v === "number") return String(v);
    if (v instanceof Tok) return `\u0001${v.id}\u0002`;
    if (v instanceof PathVal) return v.path.split(".").pop() ?? "";
    if (v instanceof Dur) return String(v.seconds);
    if (Array.isArray(v)) return v.map((x) => this.str(x)).join(",");
    return v === UNKNOWN ? "{…}" : "[object Object]";
  }

  dur(seconds: number): Dur {
    if (!Number.isFinite(seconds)) throw new SimError("The simulator can't read this duration: use a plain number.", "Unsupported");
    return new Dur(seconds);
  }

  /** Refuses values whose size (counting shared parts every time they appear) would blow up later. */
  bounded<T>(v: T): T {
    let budget = 2000;
    const stack: unknown[] = [v];
    while (stack.length) {
      const x = stack.pop();
      if (--budget < 0) throw new SimError("The simulator stopped: this value is far larger than any exercise needs.", "LimitExceeded");
      if (Array.isArray(x)) stack.push(...x);
      else if (isRec(x)) stack.push(...Object.values(x));
    }
    return v;
  }

  /** Minimal format-spec padding: `02d`, `5`, `>3`. */
  pad(text: string, spec?: string): string {
    const m = /^([<>^]?)(0?)(\d*)/.exec(spec ?? "");
    const width = Math.min(Number(m?.[3] ?? 0), 100);
    if (!width) return text;
    return m?.[1] === "<" ? text.padEnd(width) : m?.[2] === "0" ? text.padStart(width, "0") : text.padStart(width);
  }

  eq(a: unknown, b: unknown): boolean {
    if (a instanceof PathVal && b instanceof PathVal) return a.path === b.path;
    if (a instanceof Dur && b instanceof Dur) return a.seconds === b.seconds;
    return a === b;
  }

  binary(n: Extract<Node, { t: "bin" }>, env: Env): unknown {
    if (n.op === "&&") {
      const a = this.ev(n.l, env);
      return this.truthy(a) ? this.ev(n.r, env) : a;
    }
    if (n.op === "||") {
      const a = this.ev(n.l, env);
      return this.truthy(a) ? a : this.ev(n.r, env);
    }
    if (n.op === "??") {
      const a = this.ev(n.l, env);
      return a === undefined || a === null ? this.ev(n.r, env) : a;
    }
    const a = this.ev(n.l, env);
    const b = this.ev(n.r, env);
    if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
    switch (n.op) {
      case "===": case "==": return this.eq(a, b);
      case "!==": case "!=": return !this.eq(a, b);
      case "in": return isRec(b) ? Object.hasOwn(b, String(this.str(a))) : Array.isArray(b) ? b.some((x) => this.eq(x, a)) : typeof b === "string" ? b.includes(this.str(a)) : UNKNOWN;
      case "not in": return isRec(b) ? !Object.hasOwn(b, String(this.str(a))) : Array.isArray(b) ? !b.some((x) => this.eq(x, a)) : UNKNOWN;
    }
    if (this.py && n.op === "%" && typeof a === "string") {
      const items = Array.isArray(b) ? b : [b];
      let i = 0;
      return a.replace(/%%|%(0?)(\d*)(?:\.\d+)?[sdr]/g, (m, zero: string, width: string) => (m === "%%" ? "%" : this.pad(this.str(items[i++]), `${zero}${width}`)));
    }
    if (n.op === "+" && (typeof a === "string" || typeof b === "string" || a instanceof Tok || b instanceof Tok)) {
      const joined = this.str(a) + this.str(b);
      if (joined.length > 100_000) throw new SimError("The simulator stopped: this string is far longer than any exercise needs.", "LimitExceeded");
      return joined;
    }
    if (typeof a !== "number" || typeof b !== "number") return UNKNOWN;
    switch (n.op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return a / b;
      case "//": return Math.floor(a / b);
      case "%": return a % b;
      case "**": return a ** b;
      case "<": return a < b;
      case ">": return a > b;
      case "<=": return a <= b;
      case ">=": return a >= b;
    }
    return UNKNOWN;
  }

  token(c: Cons, attr: string): Tok {
    const t = new Tok(this.tokens.length, c, attr);
    this.tokens.push(t);
    return t;
  }

  member(obj: unknown, prop: string): unknown {
    const p = this.py ? camel(prop) : prop;
    if (obj === undefined || obj === null) {
      if (this.py) throw new SimError(`AttributeError: 'NoneType' object has no attribute '${prop}'`, "AttributeError");
      return undefined;
    }
    if (obj === UNKNOWN) return UNKNOWN;
    if (obj instanceof Mod) return isModuleName(prop) ? new Mod(moduleName(prop)) : new PathVal(`${obj.key}.${p}`);
    if (obj instanceof PathVal) return new PathVal(`${obj.path}.${p}`);
    if (obj instanceof Cons) return this.consMember(obj, prop, p);
    if (obj instanceof Host) return HOST;
    if (isRec(obj)) return Object.hasOwn(obj, prop) ? obj[prop] : Object.hasOwn(obj, p) ? obj[p] : undefined;
    if (Array.isArray(obj) || typeof obj === "string") return prop === "length" ? obj.length : UNKNOWN;
    return UNKNOWN;
  }

  consMember(c: Cons, prop: string, p: string): unknown {
    if (c.fields.has(prop)) return c.fields.get(prop);
    if (c.fields.has(p)) return c.fields.get(p);
    if (ATTRS[c.type]?.includes(p)) return this.token(c, p);
    if ((c.type === "apigateway.RestApi" || c.type === "apigateway.LambdaRestApi") && p === "root") return new ResourceVal(c, []);
    if (p === "node") return HOST;
    const cls = c.userClass ?? SPECS[c.type]?.cls ?? c.type;
    throw this.err(`error TS2339: Property '${prop}' does not exist on type '${cls}'.`, `AttributeError: '${cls}' object has no attribute '${prop}'`, this.py ? "AttributeError" : "TS2339");
  }

  /* ── calls ──────────────────────────────────────────────────────────────── */

  args(n: Extract<Node, { t: "call" }>, env: Env): Args {
    const pos = n.args.map((a) => this.ev(a, env));
    const kw: Rec = {};
    const explicit = new Set<string>();
    for (const [k, v] of n.kw) {
      const val = this.ev(v, env);
      if (k === null) {
        if (isRec(val)) Object.assign(kw, val);
      } else {
        kw[k] = val;
        explicit.add(k);
      }
    }
    const third = n.args[2];
    if (third && third.t === "obj") for (const [k] of third.entries) if (k !== null) explicit.add(k);
    return { pos, kw, explicit };
  }

  call(n: Extract<Node, { t: "call" }>, env: Env): unknown {
    const f = n.fn;
    const isSuper = (f.t === "id" && f.name === "super") || (f.t === "mem" && f.prop === "__init__" && f.obj.t === "call" && f.obj.fn.t === "id" && f.obj.fn.name === "super");
    const a = this.args(n, env);
    if (isSuper) return this.superCall(a, env);
    if (f.t === "id" && f.name === "range" && !env.has("range")) {
      const nums = a.pos;
      if (!nums.length || nums.length > 3 || nums.some((x) => typeof x !== "number" || !Number.isInteger(x))) {
        throw new SimError("TypeError: 'range' expects one to three integer arguments", "TypeError");
      }
      const [lo, hi, step] = nums.length === 1 ? [0, nums[0] as number, 1] : [nums[0] as number, nums[1] as number, (nums[2] as number | undefined) ?? 1];
      if (step === 0) throw new SimError("ValueError: range() arg 3 must not be zero", "ValueError");
      const out: number[] = [];
      for (let v = lo; step > 0 ? v < hi : v > hi; v += step) {
        out.push(v);
        if (out.length > 200) throw new SimError("The simulator stopped: this loop runs far more times than any exercise needs.", "LimitExceeded");
      }
      return out;
    }
    if (this.py && f.t === "id" && !env.has(f.name)) {
      if (f.name === "str" && a.pos.length === 1) return this.str(a.pos[0]);
      if (f.name === "dict") return { ...(isRec(a.pos[0]) ? a.pos[0] : {}), ...a.kw };
    }
    if (f.t === "mem") return this.method(this.ev(f.obj, env), f.prop, a);
    return this.invoke(this.ev(f, env), a);
  }

  invoke(callee: unknown, a: Args): unknown {
    if (callee instanceof UserClass) return this.instantiate(callee, a);
    if (callee instanceof PathVal) return this.callPath(callee.path, a);
    if (callee instanceof Fn) return this.callFn(callee, a);
    if (callee === HOST) return this.runCallbacks(a);
    if (callee === UNKNOWN) return UNKNOWN;
    throw this.err("error TS2349: This expression is not callable.", "TypeError: object is not callable", "TypeError");
  }

  runCallbacks(a: Args) {
    for (const v of a.pos) if (v instanceof Fn) this.callFn(v, { pos: [], kw: {}, explicit: new Set() });
    return HOST;
  }

  callFn(fn: Fn, a: Args): unknown {
    if (++this.depth > 60) throw new SimError("The simulator stopped: too many nested calls.", "LimitExceeded");
    try {
      const env = new Env(fn.env);
      this.bind(fn.params, a, env, fn.name);
      return this.exec(fn.body, env)?.ret;
    } finally {
      this.depth--;
    }
  }

  bind(params: Param[], a: Args, env: Env, owner: string) {
    const kw: Rec = { ...a.kw };
    let i = 0;
    for (const p of params) {
      if (p.rest === "args") {
        env.set(p.name, a.pos.slice(i));
        i = a.pos.length;
      } else if (p.rest === "kwargs") {
        env.set(p.name, kw);
      } else if (i < a.pos.length) env.set(p.name, a.pos[i++]);
      else if (p.name in kw) {
        env.set(p.name, kw[p.name]);
        delete kw[p.name];
      } else if (p.def) env.set(p.name, this.ev(p.def, env));
      else if (this.py) throw new SimError(`TypeError: ${owner}() missing 1 required positional argument: '${p.name}'`, "TypeError");
      else env.set(p.name, undefined);
    }
  }

  /* ── user-defined stacks and constructs ─────────────────────────────────── */

  rootBase(cls: UserClass): string | null {
    let b: unknown = cls.base;
    while (b instanceof UserClass) b = b.base;
    return b instanceof PathVal && (b.path === "core.Stack" || b.path === "constructs.Construct") ? b.path : null;
  }

  instantiate(cls: UserClass, a: Args): Cons {
    const root = this.rootBase(cls);
    if (!root) {
      throw this.err(
        `error TS2507: '${cls.name}' must extend cdk.Stack or Construct to be created with new.`,
        `TypeError: ${cls.name} must inherit from Stack or Construct`,
        "TypeError"
      );
    }
    const inst = new Cons(root === "core.Stack" ? "core.Stack" : "constructs.Construct", "", null);
    inst.userClass = cls.name;
    inst.line = cls.line;
    this.runCtor(cls, inst, a);
    if (!inst.ready) {
      throw this.err(
        "error TS2377: Constructors for derived classes must contain a 'super' call.",
        `RuntimeError: ${cls.name}.__init__ never called super().__init__(scope, construct_id) — it isn't attached to the app.`,
        this.py ? "RuntimeError" : "TS2377"
      );
    }
    return inst;
  }

  runCtor(cls: UserClass, inst: Cons, a: Args): void {
    if (!cls.ctor) return this.initBase(cls, inst, a);
    const env = new Env(cls.env);
    env.set("this", inst);
    env.set("%class", cls);
    if (this.py) {
      if (cls.params[0]) env.set(cls.params[0].name, inst);
      this.bind(cls.params.slice(1), a, env, `${cls.name}.__init__`);
    } else this.bind(cls.params, a, env, cls.name);
    this.exec(cls.ctor, env);
  }

  initBase(cls: UserClass, inst: Cons, a: Args): void {
    if (cls.base instanceof UserClass) return this.runCtor(cls.base, inst, a);
    this.construct((cls.base as PathVal).path, a, inst);
  }

  superCall(a: Args, env: Env): undefined {
    const inst = env.get("this");
    const cls = env.get("%class");
    if (!(inst instanceof Cons) || !(cls instanceof UserClass)) throw new SimError("super() can only be called inside a constructor.", "SyntaxError");
    this.initBase(cls, inst, a);
    return undefined;
  }

  /* ── library constructs ─────────────────────────────────────────────────── */

  typeName(v: unknown): string {
    if (v === undefined) return "undefined";
    if (v === null) return this.py ? "NoneType" : "null";
    if (Array.isArray(v)) return "array";
    if (v instanceof Cons) return v.userClass ?? SPECS[v.type]?.cls ?? v.type;
    return typeof v;
  }

  construct(type: string, a: Args, existing?: Cons): Cons {
    const spec = SPECS[type];
    let scope: Cons | null = null;
    let id = "";
    const s = a.pos[0];
    if (!(s instanceof Cons)) {
      throw this.err(
        `error TS2345: Argument of type '${this.typeName(s)}' is not assignable to parameter of type 'Construct'. The first argument of ${spec.cls} is the scope, usually \`this\`.`,
        `TypeError: ${spec.cls}() missing the required positional argument 'scope' — pass self as the first argument`,
        this.py ? "TypeError" : "TS2345"
      );
    }
    scope = s;
    if (!scope.ready && scope.userClass) throw new SimError("This construct isn't attached yet: call super() before creating resources.", "SynthError");
    const rawId = a.pos[1];
    if (typeof rawId !== "string") {
      throw this.err(
        `error TS2554: Expected 2-3 arguments, but got ${a.pos.length}. The second argument is the construct id, a string.`,
        `TypeError: ${spec.cls}() missing the required positional argument 'id' (a string)`,
        this.py ? "TypeError" : "TS2554"
      );
    }
    id = rawId;
    const given = a.pos[2];
    const props: Rec = {};
    if (isRec(given)) Object.assign(props, given);
    Object.assign(props, a.kw);
    const named: Rec = {};
    for (const [k, v] of Object.entries(props)) {
      const name = canon(spec.props, k);
      if (!name) {
        if (a.explicit.has(k)) {
          throw this.err(
            `error TS2353: Object literal may only specify known properties, and '${k}' does not exist in type '${spec.propsType}'.`,
            `TypeError: ${spec.cls}.__init__() got an unexpected keyword argument '${k}'`,
            this.py ? "TypeError" : "TS2353"
          );
        }
        continue;
      }
      named[name] = v;
    }
    for (const r of spec.required) {
      if (named[r] === undefined) {
        throw this.err(
          `error TS2345: Property '${r}' is missing in type '{ ... }' but required in type '${spec.propsType}'.`,
          `TypeError: ${spec.cls}.__init__() missing 1 required keyword-only argument: '${snake(r)}'`,
          this.py ? "TypeError" : "TS2345"
        );
      }
    }
    this.validate(type, named, scope, id);
    if (scope.children.some((c) => c.id === id)) {
      const where = scope.type === "core.Stack" ? `Stack [${scope.id}]` : scope.type === "core.App" ? "App" : `${scope.userClass ?? SPECS[scope.type]?.cls ?? scope.type} [${scope.id}]`;
      throw new SimError(`There is already a Construct with name '${id}' in ${where}`, "ValidationError");
    }
    const c = existing ?? new Cons(type, id, scope);
    c.type = type;
    c.id = id;
    c.parent = scope;
    c.props = named;
    c.ready = true;
    scope.children.push(c);
    this.all.push(c);
    if (type === "apigateway.LambdaRestApi" && named.proxy !== false) {
      const integration = new ValueObj("apigateway.LambdaIntegration", { handler: named.handler });
      c.apiResources.push(["{proxy+}"]);
      c.apiMethods.push({ path: [], method: "ANY", integration }, { path: ["{proxy+}"], method: "ANY", integration });
    }
    return c;
  }

  makeApp(): Cons {
    const app = new Cons("core.App", "App", null);
    app.ready = true;
    this.all.push(app);
    return app;
  }

  enumError(prop: string, value: unknown, enumKey: string): SimError | null {
    const cls = enumKey.split(".").pop() ?? enumKey;
    if (value instanceof PathVal) {
      const rest = value.path.startsWith(enumKey + ".") ? value.path.slice(enumKey.length + 1) : null;
      if (rest && ENUMS[enumKey].includes(rest)) return null;
      const bad = rest ?? value.path;
      return this.err(`error TS2339: Property '${bad}' does not exist on type 'typeof ${cls}'.`, `AttributeError: type object '${cls}' has no attribute '${bad}'`, this.py ? "AttributeError" : "TS2339");
    }
    if (value === undefined || value === UNKNOWN) return null;
    return this.err(
      `error TS2322: Type '${this.typeName(value)}' is not assignable to type '${cls}'. Use ${cls}.${ENUMS[enumKey][0]}-style members for \`${prop}\`.`,
      `TypeError: type of argument ${snake(prop)} must be ${cls}; got ${this.typeName(value)} instead`,
      this.py ? "TypeError" : "TS2322"
    );
  }

  validate(type: string, p: Rec, scope: Cons, id: string) {
    const bad = (m: string) => new SimError(m, "ValidationError");
    for (const [prop, enumKey] of Object.entries(PROP_ENUMS[type] ?? {})) {
      const e = this.enumError(prop, p[prop], enumKey);
      if (e) throw e;
    }
    switch (type) {
      case "core.Stack": {
        if (scope.type !== "core.App") throw bad("A Stack must be created in an App: pass the app as the first argument.");
        const name = typeof p.stackName === "string" ? p.stackName : id;
        if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(name)) throw bad(`Stack name must match the regular expression: /^[A-Za-z][A-Za-z0-9-]*$/, got '${name}'`);
        if (p.env !== undefined && !isRec(p.env)) throw bad("`env` must be an object like { account, region }.");
        break;
      }
      case "s3.Bucket": {
        const name = p.bucketName;
        if (typeof name === "string" && !name.includes("\u0001")) {
          const problems: string[] = [];
          if (name.length < 3 || name.length > 63) problems.push("Bucket name must be at least 3 and no more than 63 characters");
          const badChar = name.search(/[^a-z0-9.-]/);
          if (badChar >= 0) problems.push(`Bucket name must only contain lowercase characters and the symbols, period (.) and dash (-) (offset: ${badChar})`);
          if (!/^[a-z0-9]/.test(name) || !/[a-z0-9]$/.test(name)) problems.push(`Bucket name must start and end with a lowercase character or number (offset: ${/^[a-z0-9]/.test(name) ? name.length - 1 : 0})`);
          if (name.includes("..")) problems.push("Bucket name must not have two periods in a row");
          if (problems.length) throw bad(`Invalid S3 bucket name (value: ${name})\n${problems.join("\n")}`);
        }
        if (p.autoDeleteObjects === true && !(p.removalPolicy instanceof PathVal && p.removalPolicy.path === "core.RemovalPolicy.DESTROY")) {
          throw bad("Cannot use 'autoDeleteObjects' property on a bucket without setting removal policy to 'DESTROY'.");
        }
        break;
      }
      case "dynamodb.Table": {
        for (const k of ["partitionKey", "sortKey"]) {
          const a = p[k];
          if (a === undefined) continue;
          if (!isRec(a) || typeof a.name !== "string" || a.type === undefined) {
            throw this.err(
              `error TS2322: \`${k}\` must be an attribute like { name: "number", type: dynamodb.AttributeType.NUMBER }.`,
              `TypeError: ${snake(k)} must be an Attribute: dynamodb.Attribute(name="number", type=dynamodb.AttributeType.NUMBER)`,
              this.py ? "TypeError" : "TS2322"
            );
          }
          const e = this.enumError("type", a.type, "dynamodb.AttributeType");
          if (e) throw e;
        }
        break;
      }
      case "lambda.Function": {
        const r = p.runtime;
        const name = r instanceof PathVal && r.path.startsWith("lambda.Runtime.") ? r.path.slice("lambda.Runtime.".length) : null;
        if (!name || !RUNTIME_NAMES.has(name)) {
          const shown = r instanceof PathVal ? r.path.split(".").pop() : this.typeName(r);
          throw this.err(`error TS2339: Property '${shown}' does not exist on type 'typeof Runtime'.`, `AttributeError: type object 'Runtime' has no attribute '${shown}'`, this.py ? "AttributeError" : "TS2339");
        }
        if (!(p.code instanceof ValueObj)) throw bad("`code` must come from lambda.Code.fromAsset(...) or lambda.Code.fromInline(...).");
        if (typeof p.handler !== "string") throw bad("`handler` must be a string like \"index.handler\".");
        if (p.timeout !== undefined && !(p.timeout instanceof Dur)) {
          throw this.err("error TS2322: `timeout` must be a Duration, like cdk.Duration.seconds(10).", "TypeError: timeout must be a Duration, like cdk.Duration.seconds(10)", this.py ? "TypeError" : "TS2322");
        }
        if (p.timeout instanceof Dur && (p.timeout.seconds < 1 || p.timeout.seconds > 900)) throw bad("Lambda timeout must be between 1 second and 15 minutes.");
        if (typeof p.memorySize === "number" && (p.memorySize < 128 || p.memorySize > 10240)) throw bad("Lambda memorySize must be between 128 and 10,240 MB.");
        if (isRec(p.environment)) {
          for (const [k, v] of Object.entries(p.environment)) {
            if (typeof v !== "string" && !(v instanceof Tok) && v !== UNKNOWN && v !== HOST) {
              throw this.err(
                `error TS2322: Type '${this.typeName(v)}' is not assignable to type 'string' (environment variable ${k}). Environment values are always strings.`,
                `TypeError: type of environment[${k}] must be str; got ${this.typeName(v)} instead`,
                this.py ? "TypeError" : "TS2322"
              );
            }
          }
        }
        break;
      }
      case "apigateway.LambdaRestApi":
        if (!(p.handler instanceof Cons) || p.handler.type !== "lambda.Function") throw bad("`handler` must be a lambda.Function.");
        break;
      case "core.CfnOutput": {
        const v = p.value;
        if (typeof v !== "string" && !(v instanceof Tok) && v !== UNKNOWN && v !== HOST) {
          throw this.err(
            `error TS2322: Type '${this.typeName(v)}' is not assignable to type 'string'. A CfnOutput value must be a string or a token.`,
            `TypeError: type of argument value must be str; got ${this.typeName(v)} instead`,
            this.py ? "TypeError" : "TS2322"
          );
        }
        break;
      }
    }
  }

  /* ── static members, constructors and methods ───────────────────────────── */

  callPath(path: string, a: Args): unknown {
    switch (path) {
      case "core.App":
        return this.makeApp();
      case "core.Stack":
      case "s3.Bucket":
      case "dynamodb.Table":
      case "lambda.Function":
      case "apigateway.RestApi":
      case "apigateway.LambdaRestApi":
      case "core.CfnOutput":
      case "constructs.Construct":
        return this.construct(path, a);
      case "core.Environment":
      case "s3.NotificationKeyFilter":
      case "dynamodb.Attribute":
      case "dynamodb.PointInTimeRecoverySpecification":
      case "apigateway.StageOptions": {
        const out: Rec = isRec(a.pos[0]) ? { ...a.pos[0] } : {};
        for (const [k, v] of Object.entries(a.kw)) out[camel(k)] = v;
        return out;
      }
      case "core.Duration.seconds": return this.dur(Number(a.pos[0]));
      case "core.Duration.minutes": return this.dur(Number(a.pos[0]) * 60);
      case "core.Duration.hours": return this.dur(Number(a.pos[0]) * 3600);
      case "core.Duration.days": return this.dur(Number(a.pos[0]) * 86400);
      case "core.Duration.millis": return this.dur(Number(a.pos[0]) / 1000);
      case "core.Size.kibibytes": return new Size(Number(a.pos[0]) / 1024);
      case "core.Size.mebibytes": return new Size(Number(a.pos[0]));
      case "core.Size.gibibytes": return new Size(Number(a.pos[0]) * 1024);
      case "core.Tags.of": {
        if (!(a.pos[0] instanceof Cons)) throw new SimError("Tags.of() needs a construct, like Tags.of(this).", "TypeError");
        return new TagsVal(a.pos[0]);
      }
      case "lambda.Code.fromAsset": return new ValueObj("lambda.Code.fromAsset", { path: a.pos[0] });
      case "lambda.Code.fromInline": return new ValueObj("lambda.Code.fromInline", { source: a.pos[0] });
      case "s3.Bucket.fromBucketName": {
        const c = this.construct("s3.Bucket", { pos: [a.pos[0], a.pos[1]], kw: {}, explicit: new Set() });
        c.imported = true;
        c.props = { bucketName: a.pos[2] };
        return c;
      }
      case "apigateway.LambdaIntegration": return new ValueObj("apigateway.LambdaIntegration", { handler: a.pos[0] });
      case "s3notifications.LambdaDestination": return new ValueObj("s3notifications.LambdaDestination", { fn: a.pos[0] });
      case "iam.PolicyStatement": {
        const spec = SPECS["iam.PolicyStatement"];
        const raw: Rec = { ...(isRec(a.pos[0]) ? a.pos[0] : {}), ...a.kw };
        const named: Rec = {};
        for (const [k, v] of Object.entries(raw)) {
          const name = canon(spec.props, k);
          if (!name) throw this.err(`error TS2353: Object literal may only specify known properties, and '${k}' does not exist in type 'PolicyStatementProps'.`, `TypeError: PolicyStatement.__init__() got an unexpected keyword argument '${k}'`, this.py ? "TypeError" : "TS2353");
          named[name] = v;
        }
        const e = this.enumError("effect", named.effect, "iam.Effect");
        if (e) throw e;
        return new ValueObj("iam.PolicyStatement", named);
      }
      case "assertions.Template.fromStack": {
        const st = a.pos[0];
        if (!(st instanceof Cons) || st.type !== "core.Stack") throw new SimError("Template.fromStack() needs a Stack.", "TypeError");
        return new TemplateVal(st, synthesize(st, this.tokens));
      }
      case "assertions.Match.anyValue": return new Matcher("anyValue", undefined);
      case "assertions.Match.absent": return new Matcher("absent", undefined);
      case "assertions.Match.objectLike": return new Matcher("objectLike", a.pos[0]);
      case "assertions.Match.arrayWith": return new Matcher("arrayWith", a.pos[0]);
      case "assertions.Match.exact": return new Matcher("exact", a.pos[0]);
      case "assertions.Match.stringLikeRegexp": return new Matcher("stringLikeRegexp", a.pos[1] ?? a.pos[0]);
    }
    const shown = path.replace(/^core\./, "");
    throw new SimError(`${shown} isn't available in this simulator. Learn CDK covers App, Stack, s3.Bucket, dynamodb.Table, lambda.Function, apigateway, notifications, CfnOutput, Tags and the assertions module.`, "Unsupported");
  }

  method(recv: unknown, prop: string, a: Args): unknown {
    const name = this.py ? camel(prop) : prop;
    if (this.py && typeof recv === "string" && prop === "format") {
      let i = 0;
      return recv
        .replace(/\{\{|\}\}/g, (m) => m[0])
        .replace(/\{(\w*)(?:!r)?(?::([^}]*))?\}/g, (_m, key: string, spec?: string) => {
          const v = key ? (key in a.kw ? a.kw[key] : a.pos[Number(key)]) : a.pos[i++];
          return this.pad(this.str(v), spec);
        });
    }
    if (Array.isArray(recv) && (prop === "forEach" || prop === "map") && a.pos[0] instanceof Fn) {
      const fn = a.pos[0];
      const out = recv.map((item, i) => this.callFn(fn, { pos: [item, i], kw: {}, explicit: new Set() }));
      return prop === "map" ? this.bounded(out) : undefined;
    }
    if (recv instanceof Mod) return this.callPath(`${recv.key}.${name}`, a);
    if (recv instanceof PathVal) return this.callPath(`${recv.path}.${name}`, a);
    if (recv instanceof Cons) {
      for (let cls: unknown = recv.userClass ? this.classes.get(recv.userClass) : undefined; cls instanceof UserClass; cls = (cls as UserClass).base) {
        const m = cls.methods.get(prop);
        if (!m) continue;
        if (++this.depth > 60) throw new SimError("The simulator stopped: too many nested calls.", "LimitExceeded");
        try {
          const env = new Env(cls.env);
          env.set("this", recv);
          env.set("%class", cls);
          if (this.py) {
            if (m.params[0]) env.set(m.params[0].name, recv);
            this.bind(m.params.slice(1), a, env, `${cls.name}.${prop}`);
          } else this.bind(m.params, a, env, prop);
          return this.exec(m.body, env)?.ret;
        } finally {
          this.depth--;
        }
      }
      return this.consMethod(recv, name, prop, a);
    }
    if (recv instanceof TagsVal) {
      if (name === "add") recv.scope.tags.push([this.str(a.pos[0]), this.str(a.pos[1])]);
      return undefined;
    }
    if (recv instanceof ResourceVal) return this.resourceMethod(recv, name, a);
    if (recv instanceof TemplateVal) return this.templateMethod(recv, name, a);
    if (recv === HOST) return this.runCallbacks(a);
    if (recv === UNKNOWN) return UNKNOWN;
    if (isRec(recv) && name === "get") return recv[this.str(a.pos[0])] ?? a.pos[1] ?? null;
    if (typeof recv === "string") {
      if (name === "toLowerCase" || name === "lower") return recv.toLowerCase();
      if (name === "toUpperCase" || name === "upper") return recv.toUpperCase();
    }
    throw this.err(`error TS2339: Property '${prop}' does not exist on this value.`, `AttributeError: object has no attribute '${prop}'`, this.py ? "AttributeError" : "TS2339");
  }

  grantee(v: unknown, how: string): Cons {
    if (v instanceof Cons && v.type === "lambda.Function") return v;
    throw new SimError(`${how}() grants permissions to a principal: pass a Lambda function (or other grantee), got ${this.typeName(v)}.`, "TypeError");
  }

  allow(g: Cons, actions: string[], resources: unknown[]) {
    g.statements.push({ effect: "Allow", actions, resources });
  }

  consMethod(c: Cons, name: string, prop: string, a: Args): unknown {
    if (name === "applyRemovalPolicy") {
      c.props = { ...c.props, removalPolicy: a.pos[0] };
      return undefined;
    }
    if (c.type === "s3.Bucket" && name === "addObjectCreatedNotification") {
      return this.consMethod(c, "addEventNotification", "addEventNotification", { ...a, pos: [new PathVal("s3.EventType.OBJECT_CREATED"), ...a.pos] });
    }
    const key = `${c.type}.${name}`;
    const objects = (b: Cons) => ({ "Fn::Join": ["", [this.token(b, "bucketArn"), "/*"]] });
    switch (key) {
      case "core.App.synth":
      case "core.Stack.addDependency":
        return undefined;
      case "s3.Bucket.grantRead": { const g = this.grantee(a.pos[0], name); this.allow(g, BUCKET_READ, [this.token(c, "bucketArn"), objects(c)]); return undefined; }
      case "s3.Bucket.grantWrite": { const g = this.grantee(a.pos[0], name); this.allow(g, BUCKET_WRITE, [this.token(c, "bucketArn"), objects(c)]); return undefined; }
      case "s3.Bucket.grantReadWrite": { const g = this.grantee(a.pos[0], name); this.allow(g, [...BUCKET_READ, ...BUCKET_WRITE], [this.token(c, "bucketArn"), objects(c)]); return undefined; }
      case "s3.Bucket.grantPut": { const g = this.grantee(a.pos[0], name); this.allow(g, BUCKET_PUT, [objects(c)]); return undefined; }
      case "s3.Bucket.grantDelete": { const g = this.grantee(a.pos[0], name); this.allow(g, ["s3:DeleteObject*"], [objects(c)]); return undefined; }
      case "s3.Bucket.addLifecycleRule":
        if (isRec(a.pos[0])) c.lifecycle.push(a.pos[0]);
        return undefined;
      case "s3.Bucket.addEventNotification": {
        const evt = a.pos[0];
        const dest = a.pos[1];
        if (!(evt instanceof PathVal)) throw this.err("error TS2345: The first argument must be an s3.EventType, like s3.EventType.OBJECT_CREATED.", "TypeError: the first argument must be an s3.EventType", this.py ? "TypeError" : "TS2345");
        const e = this.enumError("eventType", evt, "s3.EventType");
        if (e) throw e;
        if (!(dest instanceof ValueObj) || dest.type !== "s3notifications.LambdaDestination" || !(dest.props.fn instanceof Cons)) {
          throw new SimError("The second argument must be a destination such as new s3n.LambdaDestination(fn).", "TypeError");
        }
        const filters = a.pos.slice(2).filter(isRec);
        const prefix = filters.find((f) => typeof f.prefix === "string")?.prefix as string | undefined;
        const suffix = filters.find((f) => typeof f.suffix === "string")?.suffix as string | undefined;
        const leaf = evt.path.split(".").pop() ?? "";
        const parts = leaf.split("_");
        const pretty = parts.slice(1).map((w) => w.charAt(0) + w.slice(1).toLowerCase());
        const kind = parts[0] === "OBJECT" ? `Object${pretty[0]}` : pretty.join("");
        const detail = parts[0] === "OBJECT" ? pretty.slice(1).join("") || "*" : "*";
        c.notifications.push({ events: [`s3:${kind}:${detail}`], dest: dest.props.fn, prefix, suffix });
        return undefined;
      }
      case "dynamodb.Table.grantReadData": { const g = this.grantee(a.pos[0], name); this.allow(g, TABLE_READ, [this.token(c, "tableArn"), this.token(c, "indexArn")]); return undefined; }
      case "dynamodb.Table.grantWriteData": { const g = this.grantee(a.pos[0], name); this.allow(g, TABLE_WRITE, [this.token(c, "tableArn"), this.token(c, "indexArn")]); return undefined; }
      case "dynamodb.Table.grantReadWriteData": {
        const g = this.grantee(a.pos[0], name);
        this.allow(g, [...TABLE_READ.filter((x) => x !== "dynamodb:DescribeTable"), ...TABLE_WRITE], [this.token(c, "tableArn"), this.token(c, "indexArn")]);
        return undefined;
      }
      case "dynamodb.Table.grantFullAccess": { const g = this.grantee(a.pos[0], name); this.allow(g, ["dynamodb:*"], [this.token(c, "tableArn"), this.token(c, "indexArn")]); return undefined; }
      case "dynamodb.Table.addGlobalSecondaryIndex": {
        const raw: Rec = { ...(isRec(a.pos[0]) ? a.pos[0] : {}), ...a.kw };
        const names = ["indexName", "partitionKey", "sortKey", "projectionType", "nonKeyAttributes", "readCapacity", "writeCapacity"];
        const named: Rec = {};
        for (const [k, v] of Object.entries(raw)) {
          const n = canon(names, k);
          if (!n) throw this.err(`error TS2353: Object literal may only specify known properties, and '${k}' does not exist in type 'GlobalSecondaryIndexProps'.`, `TypeError: add_global_secondary_index() got an unexpected keyword argument '${k}'`, this.py ? "TypeError" : "TS2353");
          named[n] = v;
        }
        if (typeof named.indexName !== "string" || !isRec(named.partitionKey)) throw new SimError("A global secondary index needs an indexName (string) and a partitionKey attribute.", "ValidationError");
        const e = this.enumError("type", named.partitionKey.type, "dynamodb.AttributeType");
        if (e) throw e;
        c.indexes.push(named);
        return undefined;
      }
      case "lambda.Function.addEnvironment":
        c.envAdds[this.str(a.pos[0])] = a.pos[1];
        return undefined;
      case "lambda.Function.addToRolePolicy": {
        const s = a.pos[0];
        if (!(s instanceof ValueObj) || s.type !== "iam.PolicyStatement") throw new SimError("addToRolePolicy() takes an iam.PolicyStatement.", "TypeError");
        const toList = (v: unknown) => (Array.isArray(v) ? v : v === undefined ? [] : [v]);
        c.statements.push({
          effect: s.props.effect instanceof PathVal ? (s.props.effect.path.endsWith("DENY") ? "Deny" : "Allow") : "Allow",
          actions: toList(s.props.actions).map(String),
          resources: toList(s.props.resources),
          conditions: s.props.conditions,
        });
        return undefined;
      }
    }
    const cls = c.userClass ?? SPECS[c.type]?.cls ?? c.type;
    throw this.err(`error TS2339: Property '${prop}' does not exist on type '${cls}'.`, `AttributeError: '${cls}' object has no attribute '${prop}'`, this.py ? "AttributeError" : "TS2339");
  }

  resourceMethod(r: ResourceVal, name: string, a: Args): unknown {
    const api = r.api;
    if (name === "addResource") {
      const part = a.pos[0];
      if (typeof part !== "string" || !part || /\//.test(part)) {
        throw new SimError("A path part may only contain a resource name or a path parameter like {number}, never a slash. Chain addResource() calls instead.", "ValidationError");
      }
      const path = [...r.path, part];
      if (api.apiResources.some((p) => p.join("/") === path.join("/"))) throw new SimError(`There is already a Construct with name '${part}' in Resource [${r.path.join("/") || "/"}]`, "ValidationError");
      api.apiResources.push(path);
      return new ResourceVal(api, path);
    }
    if (name === "addMethod") {
      const method = a.pos[0];
      if (typeof method !== "string" || !HTTP_METHODS.has(method)) throw new SimError(`The HTTP method must be one of ${[...HTTP_METHODS].join(", ")} (uppercase), got ${this.str(method)}.`, "ValidationError");
      if (api.apiMethods.some((m) => m.path.join("/") === r.path.join("/") && m.method === method)) throw new SimError(`There is already a Construct with name '${method}' in Resource [${r.path.join("/") || "/"}]`, "ValidationError");
      const integration = a.pos[1];
      if (!(integration instanceof ValueObj)) throw new SimError("Pass an integration, like new apigw.LambdaIntegration(fn), as the second argument of addMethod().", "ValidationError");
      api.apiMethods.push({ path: r.path, method, integration });
      return undefined;
    }
    throw this.err(`error TS2339: Property '${name}' does not exist on type 'IResource'.`, `AttributeError: 'Resource' object has no attribute '${name}'`, this.py ? "AttributeError" : "TS2339");
  }

  templateMethod(t: TemplateVal, name: string, a: Args): unknown {
    const type = a.pos[0];
    const fail = (m: string) => new SimError(this.py ? `jsii.errors.JavaScriptError: ${m}` : `Error: ${m}`, "AssertionError");
    const matching = (expected: unknown, whole: boolean) => {
      const found = resourcesOf(t.template, String(type));
      const results = found.map(([id, r]) => {
        const out: string[] = [];
        const ok = whole ? matches(r, expected, "", out) : matches(r.Properties ?? {}, expected, "/Properties", out);
        return { id, r, ok, out };
      });
      return { found, results };
    };
    switch (name) {
      case "hasResourceProperties":
      case "hasResource": {
        this.assertions++;
        const { found, results } = matching(a.pos[1], name === "hasResource");
        if (!found.length) throw fail(`Template has 0 resources with type ${String(type)}.`);
        if (results.some((r) => r.ok)) {
          this.assertionLog.push({ method: name, type: String(type), expected: a.pos[1] });
          return undefined;
        }
        const closest = results.reduce((x, y) => (y.out.length < x.out.length ? y : x));
        throw fail(
          `Template has ${found.length} resources with type ${String(type)}, but none match as expected.\nThe closest result is:\n${JSON.stringify(closest.r.Properties ?? closest.r, null, 2).slice(0, 700)}\nwith the following mismatches:\n\t${closest.out.join("\n\t")}`
        );
      }
      case "resourceCountIs": {
        this.assertions++;
        const count = resourcesOf(t.template, String(type)).length;
        if (count !== a.pos[1]) throw fail(`Expected ${String(a.pos[1])} resources of type ${String(type)} but found ${count}`);
        this.assertionLog.push({ method: name, type: String(type), expected: undefined, count });
        return undefined;
      }
      case "resourcePropertiesCountIs": {
        this.assertions++;
        const { results } = matching(a.pos[1], false);
        const count = results.filter((r) => r.ok).length;
        if (count !== a.pos[2]) throw fail(`Expected ${String(a.pos[2])} resources of type ${String(type)} with matching properties but found ${count}`);
        this.assertionLog.push({ method: name, type: String(type), expected: a.pos[1], count });
        return undefined;
      }
      case "hasOutput": {
        this.assertions++;
        const outputs = t.template.Outputs ?? {};
        const want = a.pos[1];
        const ok = Object.entries(outputs).some(([id, o]) => (id === type || type === "*" || typeof type !== "string") && matches(o, want, `/Outputs/${id}`, []));
        if (!ok) throw fail(`Template has 0 outputs named ${String(type)} that match as expected.`);
        return undefined;
      }
      case "findResources": {
        const { results } = matching(a.pos[1] ?? {}, false);
        return Object.fromEntries(results.filter((r) => r.ok).map((r) => [r.id, r.r]));
      }
    }
    throw this.err(`error TS2339: Property '${name}' does not exist on type 'Template'.`, `AttributeError: 'Template' object has no attribute '${name}'`, this.py ? "AttributeError" : "TS2339");
  }
}

export { countByType };
