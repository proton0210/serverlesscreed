/**
 * The small syntax tree both parsers (TypeScript via the compiler API, Python via parse-py.ts) produce.
 * The interpreter in interp.ts walks it; nothing here is ever executed as real code.
 * Keep this file free of path aliases and JSX: scripts/check-cdk-unit.mjs imports it directly.
 */
export type Language = "typescript" | "python";

export type Node =
  | { t: "lit"; v: string | number | boolean | null | undefined }
  | { t: "arr"; items: Node[] }
  /** key `null` is a spread: `{ ...x }` or `**x`. */
  | { t: "obj"; entries: [string | null, Node][] }
  | { t: "id"; name: string }
  | { t: "mem"; obj: Node; prop: string }
  /** `kw` holds Python keyword arguments (key `null` is `**spread`); TypeScript puts everything in `args`. */
  | { t: "call"; fn: Node; args: Node[]; kw: [string | null, Node][]; isNew: boolean }
  | { t: "tpl"; parts: (string | Node)[] }
  | { t: "bin"; op: string; l: Node; r: Node }
  | { t: "un"; op: string; e: Node }
  /** `xs[i]` / `d[key]` with a computed index. */
  | { t: "idx"; obj: Node; index: Node }
  | { t: "cond"; c: Node; a: Node; b: Node }
  | { t: "fn"; params: Param[]; body: Stmt[] }
  | { t: "unknown"; why: string };

export type Param = { name: string; def?: Node; rest?: "args" | "kwargs" };

export type Stmt =
  | { t: "import"; module: string; alias?: string; names: [string, string][]; line: number }
  | { t: "class"; name: string; base?: Node; params: Param[]; ctor: Stmt[] | null; methods?: { name: string; params: Param[]; body: Stmt[] }[]; line: number }
  /** `for x of xs` / `for x in xs` / `for i in range(n)`, with a single loop variable. */
  | { t: "for"; variable: string; iter: Node; body: Stmt[]; line: number }
  | { t: "def"; name: string; params: Param[]; body: Stmt[]; line: number }
  | { t: "assign"; target: Node; value: Node; line: number }
  | { t: "destructure"; names: [string, string][]; value: Node; line: number }
  | { t: "expr"; value: Node; line: number }
  | { t: "if"; cond: Node; then: Stmt[]; else: Stmt[]; line: number }
  | { t: "return"; value?: Node; line: number }
  | { t: "jump"; kind: "break" | "continue"; line: number }
  /** `throw` / `raise`: reaching one makes the real program fail. */
  | { t: "throw"; line: number }
  /** A statement the simulator doesn't run (loops, try/except handlers, …). */
  | { t: "skip"; what: string; line: number };

export type ParseResult = { ok: true; stmts: Stmt[] } | { ok: false; message: string; line: number };

export const lit = (v: string | number | boolean | null | undefined): Node => ({ t: "lit", v });
export const unknown = (why: string): Node => ({ t: "unknown", why });
