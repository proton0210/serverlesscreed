/**
 * Values the simulator passes around while it "runs" a CDK app: constructs, tokens, enum paths, durations…
 * Keep this file free of path aliases and JSX.
 */
import type { Param, Stmt } from "./ir.ts";

export const UNKNOWN = Symbol("unknown");
export type Rec = Record<string, unknown>;

export class SimError extends Error {
  code: string;
  constructor(message: string, code = "SynthError") {
    super(message);
    this.code = code;
  }
}

/** A module namespace such as `s3` or `cdk`. `key` is the canonical module key from catalog.moduleKey. */
export class Mod {
  key: string;
  constructor(key: string) {
    this.key = key;
  }
}

/** A class, static member or enum value, by canonical path: "s3.Bucket", "core.RemovalPolicy.DESTROY". */
export class PathVal {
  path: string;
  constructor(path: string) {
    this.path = path;
  }
}

export class Dur {
  seconds: number;
  constructor(seconds: number) {
    this.seconds = seconds;
  }
}

export class Size {
  mib: number;
  constructor(mib: number) {
    this.mib = mib;
  }
}

/** A value only known at deploy time, like `table.tableName`. Printing it gives `${Token[…]}`, not the name. */
export class Tok {
  id: number;
  cons: Cons | null;
  attr: string;
  constructor(id: number, cons: Cons | null, attr: string) {
    this.id = id;
    this.cons = cons;
    this.attr = attr;
  }
}

/** Something from outside CDK (`process`, `path`, `console`, test frameworks). Reading from it gives more of the same. */
export class Host {}
export const HOST = new Host();

export type IamStatement = { effect: string; actions: string[]; resources: unknown[]; conditions?: unknown; sid?: string };
export type Notification = { events: string[]; dest: Cons; prefix?: string; suffix?: string };

export class Cons {
  type: string;
  id: string;
  parent: Cons | null;
  children: Cons[] = [];
  props: Rec = {};
  fields = new Map<string, unknown>();
  userClass: string | null = null;
  line = 0;
  /** False for a user-defined construct until its constructor has called super(). */
  ready = false;
  imported = false;
  statements: IamStatement[] = [];
  notifications: Notification[] = [];
  indexes: Rec[] = [];
  envAdds: Rec = {};
  tags: [string, string][] = [];
  lifecycle: Rec[] = [];
  apiResources: string[][] = [];
  apiMethods: { path: string[]; method: string; integration: unknown }[] = [];

  constructor(type: string, id: string, parent: Cons | null) {
    this.type = type;
    this.id = id;
    this.parent = parent;
  }

  get stack(): Cons | null {
    let c: Cons | null = this;
    while (c && c.type !== "core.Stack") c = c.parent;
    return c;
  }

  /** Construct ids from just below the stack down to this construct. */
  path(): string[] {
    const out: string[] = [];
    let c: Cons | null = this;
    while (c && c.type !== "core.Stack" && c.type !== "core.App") {
      out.unshift(c.id);
      c = c.parent;
    }
    return out;
  }

  descendants(): Cons[] {
    return this.children.flatMap((c) => [c, ...c.descendants()]);
  }

  get stackName(): string {
    const n = this.props.stackName;
    return typeof n === "string" ? n : this.id;
  }
}

export class ValueObj {
  type: string;
  props: Rec;
  constructor(type: string, props: Rec) {
    this.type = type;
    this.props = props;
  }
}

export class ResourceVal {
  api: Cons;
  path: string[];
  constructor(api: Cons, path: string[]) {
    this.api = api;
    this.path = path;
  }
}

export class TagsVal {
  scope: Cons;
  constructor(scope: Cons) {
    this.scope = scope;
  }
}

export class Matcher {
  kind: string;
  arg: unknown;
  constructor(kind: string, arg: unknown) {
    this.kind = kind;
    this.arg = arg;
  }
}

export class Env {
  vars = new Map<string, unknown>();
  parent: Env | null;
  constructor(parent: Env | null) {
    this.parent = parent;
  }
  has(name: string): boolean {
    return this.vars.has(name) || (this.parent?.has(name) ?? false);
  }
  get(name: string): unknown {
    if (this.vars.has(name)) return this.vars.get(name);
    return this.parent?.get(name);
  }
  set(name: string, v: unknown) {
    this.vars.set(name, v);
  }
}

export class Fn {
  name: string;
  params: Param[];
  body: Stmt[];
  env: Env;
  constructor(name: string, params: Param[], body: Stmt[], env: Env) {
    this.name = name;
    this.params = params;
    this.body = body;
    this.env = env;
  }
}

export class UserClass {
  name: string;
  base: unknown;
  params: Param[];
  ctor: Stmt[] | null;
  methods = new Map<string, { params: Param[]; body: Stmt[] }>();
  env: Env;
  line: number;
  constructor(name: string, base: unknown, params: Param[], ctor: Stmt[] | null, env: Env, line: number) {
    this.name = name;
    this.base = base;
    this.params = params;
    this.ctor = ctor;
    this.env = env;
    this.line = line;
  }
}

export const isRec = (v: unknown): v is Rec => Boolean(v) && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
