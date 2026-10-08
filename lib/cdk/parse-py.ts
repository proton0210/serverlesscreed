/**
 * Python → IR: a small hand-written parser for the subset CDK apps use (imports, classes with __init__,
 * functions, assignments, calls with keyword arguments, f-strings, dicts, lists, ternaries). It reads
 * source text only; nothing is executed. Keep this file free of path aliases and JSX.
 */
import { lit, unknown } from "./ir.ts";
import type { Node, Param, ParseResult, Stmt } from "./ir.ts";

class PySyntaxError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

type Line = { indent: number; text: string; line: number };

/** Splits source into logical lines: comments dropped, bracketed and backslash-continued lines joined. */
function logicalLines(code: string): Line[] {
  const out: Line[] = [];
  let buf = "";
  let indent = 0;
  let depth = 0;
  let startLine = 1;
  let lineNo = 1;
  let atStart = true;
  const src = code.replace(/\r\n?/g, "\n");
  const flush = () => {
    if (buf.trim()) out.push({ indent, text: buf.trim(), line: startLine });
    buf = "";
    atStart = true;
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (atStart && buf === "") {
      // measure indentation of a fresh logical line
      let j = i;
      let w = 0;
      while (j < src.length && (src[j] === " " || src[j] === "\t")) {
        w += src[j] === "\t" ? 4 : 1;
        j++;
      }
      if (src[j] === "\n" || src[j] === "#" || j >= src.length) {
        // blank or comment-only line
        while (j < src.length && src[j] !== "\n") j++;
        lineNo++;
        i = j;
        continue;
      }
      indent = w;
      startLine = lineNo;
      atStart = false;
      i = j - 1;
      continue;
    }
    if (ch === "\\" && src[i + 1] === "\n") {
      i++;
      lineNo++;
      buf += " ";
      continue;
    }
    if (ch === "#") {
      while (i < src.length && src[i] !== "\n") i++;
      i--;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const triple = src.startsWith(ch.repeat(3), i);
      const q = triple ? ch.repeat(3) : ch;
      let j = i + q.length;
      let closed = false;
      while (j < src.length) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src.startsWith(q, j)) {
          closed = true;
          break;
        }
        if (!triple && src[j] === "\n") break;
        j++;
      }
      if (!closed) throw new PySyntaxError(triple ? "unterminated triple-quoted string literal" : "unterminated string literal", lineNo);
      const chunk = src.slice(i, j + q.length);
      lineNo += (chunk.match(/\n/g) ?? []).length;
      buf += chunk;
      i = j + q.length - 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth < 0) throw new PySyntaxError(`unmatched '${ch}'`, lineNo);
    }
    if (ch === "\n") {
      lineNo++;
      if (depth > 0) buf += " ";
      else flush();
      continue;
    }
    buf += ch;
  }
  if (depth > 0) throw new PySyntaxError("'(' was never closed", startLine);
  flush();
  return out;
}

type Tk = { k: "name" | "num" | "str" | "op" | "end"; v: string; f?: boolean; raw?: boolean };

const OPS = ["**=", "//=", "...", "->", ":=", "==", "!=", "<=", ">=", "**", "//", "+=", "-=", "*=", "/=", "%=", "(", ")", "[", "]", "{", "}", ",", ":", ";", ".", "=", "+", "-", "*", "/", "%", "<", ">", "@", "~", "&", "|", "^", "!"];

function tokenize(text: string, line: number): Tk[] {
  const out: Tk[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const sm = /^([rRbBfFuU]{0,2})("""|'''|"|')/.exec(text.slice(i, i + 5));
    if (sm) {
      const prefix = sm[1].toLowerCase();
      const q = sm[2];
      let j = i + sm[0].length;
      let closed = false;
      while (j < text.length) {
        if (text[j] === "\\") {
          j += 2;
          continue;
        }
        if (text.startsWith(q, j)) {
          closed = true;
          break;
        }
        j++;
      }
      if (!closed) throw new PySyntaxError("unterminated string literal", line);
      out.push({ k: "str", v: text.slice(i + sm[0].length, j), f: prefix.includes("f"), raw: prefix.includes("r") });
      i = j + q.length;
      continue;
    }
    const nm = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i));
    if (nm) {
      out.push({ k: "name", v: nm[0] });
      i += nm[0].length;
      continue;
    }
    const num = /^\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (num) {
      out.push({ k: "num", v: num[0].replace(/_/g, "") });
      i += num[0].length;
      continue;
    }
    const op = OPS.find((o) => text.startsWith(o, i));
    if (!op) throw new PySyntaxError(`invalid character '${ch}'`, line);
    out.push({ k: "op", v: op });
    i += op.length;
  }
  out.push({ k: "end", v: "" });
  return out;
}

function unescape(s: string, raw: boolean | undefined): string {
  if (raw) return s;
  return s.replace(/\\(n|t|r|\\|"|'|0)/g, (_m, c: string) => ({ n: "\n", t: "\t", r: "\r", "\\": "\\", '"': '"', "'": "'", "0": "\0" })[c] ?? c);
}

class ExprParser {
  toks: Tk[];
  p = 0;
  line: number;
  constructor(toks: Tk[], line: number) {
    this.toks = toks;
    this.line = line;
  }
  get cur() {
    return this.toks[this.p];
  }
  err(msg = "invalid syntax"): never {
    throw new PySyntaxError(msg, this.line);
  }
  isOp(v: string) {
    return this.cur.k === "op" && this.cur.v === v;
  }
  isName(v: string) {
    return this.cur.k === "name" && this.cur.v === v;
  }
  eatOp(v: string) {
    if (this.isOp(v)) {
      this.p++;
      return true;
    }
    return false;
  }
  expectOp(v: string) {
    if (!this.eatOp(v)) this.err(`invalid syntax (expected '${v}')`);
  }
  atEnd() {
    return this.cur.k === "end";
  }

  expr(): Node {
    if (this.isName("lambda")) return this.lambda();
    const a = this.or();
    if (this.isName("if")) {
      this.p++;
      const c = this.or();
      if (!this.isName("else")) this.err("invalid syntax (conditional expression needs 'else')");
      this.p++;
      return { t: "cond", c, a, b: this.expr() };
    }
    return a;
  }
  lambda(): Node {
    this.p++;
    const params: Param[] = [];
    while (!this.isOp(":")) {
      if (this.cur.k !== "name") this.err();
      const name = this.cur.v;
      this.p++;
      let def: Node | undefined;
      if (this.eatOp("=")) def = this.expr();
      params.push({ name, def });
      if (!this.eatOp(",")) break;
    }
    this.expectOp(":");
    return { t: "fn", params, body: [{ t: "return", value: this.expr(), line: this.line }] };
  }
  or(): Node {
    let l = this.and();
    while (this.isName("or")) {
      this.p++;
      l = { t: "bin", op: "||", l, r: this.and() };
    }
    return l;
  }
  and(): Node {
    let l = this.not();
    while (this.isName("and")) {
      this.p++;
      l = { t: "bin", op: "&&", l, r: this.not() };
    }
    return l;
  }
  not(): Node {
    if (this.isName("not") && !(this.toks[this.p + 1]?.v === "in")) {
      this.p++;
      return { t: "un", op: "!", e: this.not() };
    }
    return this.cmp();
  }
  cmp(): Node {
    let l = this.arith();
    for (;;) {
      let op: string | null = null;
      if (this.cur.k === "op" && ["==", "!=", "<", ">", "<=", ">="].includes(this.cur.v)) {
        op = this.cur.v === "==" ? "===" : this.cur.v === "!=" ? "!==" : this.cur.v;
        this.p++;
      } else if (this.isName("is")) {
        this.p++;
        if (this.isName("not")) {
          this.p++;
          op = "!==";
        } else op = "===";
      } else if (this.isName("in")) {
        this.p++;
        op = "in";
      } else if (this.isName("not") && this.toks[this.p + 1]?.v === "in") {
        this.p += 2;
        op = "not in";
      }
      if (!op) return l;
      l = { t: "bin", op, l, r: this.arith() };
    }
  }
  arith(): Node {
    let l = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.cur.v;
      this.p++;
      l = { t: "bin", op, l, r: this.term() };
    }
    return l;
  }
  term(): Node {
    let l = this.factor();
    while (this.isOp("*") || this.isOp("/") || this.isOp("//") || this.isOp("%")) {
      const op = this.cur.v;
      this.p++;
      l = { t: "bin", op, l, r: this.factor() };
    }
    return l;
  }
  factor(): Node {
    if (this.isOp("-") || this.isOp("+") || this.isOp("~")) {
      const op = this.cur.v;
      this.p++;
      return { t: "un", op, e: this.factor() };
    }
    return this.power();
  }
  power(): Node {
    const base = this.postfix();
    if (this.eatOp("**")) return { t: "bin", op: "**", l: base, r: this.factor() };
    return base;
  }
  postfix(): Node {
    let n = this.atom();
    for (;;) {
      if (this.eatOp(".")) {
        if (this.cur.k !== "name") this.err();
        n = { t: "mem", obj: n, prop: this.cur.v };
        this.p++;
      } else if (this.isOp("(")) {
        this.p++;
        const { args, kw } = this.callArgs();
        n = { t: "call", fn: n, args, kw, isNew: false };
      } else if (this.isOp("[")) {
        this.p++;
        const idx = this.isOp("]") ? unknown("empty index") : this.expr();
        const simple = this.isOp("]");
        while (!this.isOp("]") && !this.atEnd()) this.p++; // slices and tuples: not evaluated
        this.expectOp("]");
        n = !simple ? unknown("a subscript") : idx.t === "lit" && typeof idx.v === "string" ? { t: "mem", obj: n, prop: idx.v } : { t: "idx", obj: n, index: idx };
      } else return n;
    }
  }
  callArgs(): { args: Node[]; kw: [string | null, Node][] } {
    const args: Node[] = [];
    const kw: [string | null, Node][] = [];
    while (!this.isOp(")")) {
      if (this.atEnd()) this.err("'(' was never closed");
      if (this.eatOp("**")) kw.push([null, this.expr()]);
      else if (this.eatOp("*")) {
        this.expr();
        args.push(unknown("*args"));
      } else if (this.cur.k === "name" && this.toks[this.p + 1]?.k === "op" && this.toks[this.p + 1].v === "=") {
        const name = this.cur.v;
        this.p += 2;
        kw.push([name, this.expr()]);
      } else {
        const e = this.expr();
        if (this.isName("for")) {
          let d = 0;
          while (!(d === 0 && this.isOp(")")) && !this.atEnd()) {
            if (this.isOp("(") || this.isOp("[") || this.isOp("{")) d++;
            if (this.isOp(")") || this.isOp("]") || this.isOp("}")) d--;
            this.p++;
          }
          args.push(unknown("a generator expression"));
        } else args.push(e);
      }
      if (!this.eatOp(",")) break;
    }
    this.expectOp(")");
    return { args, kw };
  }
  skipComprehension(close: string) {
    let d = 0;
    while (!(d === 0 && this.isOp(close)) && !this.atEnd()) {
      if (this.isOp("(") || this.isOp("[") || this.isOp("{")) d++;
      if (this.isOp(")") || this.isOp("]") || this.isOp("}")) d--;
      this.p++;
    }
    this.expectOp(close);
  }
  atom(): Node {
    const t = this.cur;
    if (t.k === "num") {
      this.p++;
      return lit(Number(t.v));
    }
    if (t.k === "str") {
      const parts: (string | Node)[] = [];
      let any = false;
      while (this.cur.k === "str") {
        const s = this.cur;
        this.p++;
        if (s.f) {
          any = true;
          parts.push(...this.fstring(s.v, s.raw));
        } else parts.push(unescape(s.v, s.raw));
      }
      return any ? { t: "tpl", parts } : lit(parts.join(""));
    }
    if (t.k === "name") {
      if (["True", "False", "None"].includes(t.v)) {
        this.p++;
        return lit(t.v === "True" ? true : t.v === "False" ? false : null);
      }
      if (["lambda"].includes(t.v)) return this.lambda();
      if (["not", "and", "or", "if", "else", "for", "in", "is", "def", "class", "return", "import", "from"].includes(t.v)) this.err();
      this.p++;
      return { t: "id", name: t.v };
    }
    if (t.k === "op" && t.v === "(") {
      this.p++;
      if (this.eatOp(")")) return { t: "arr", items: [] };
      const first = this.expr();
      if (this.isName("for")) {
        this.skipComprehension(")");
        return unknown("a generator expression");
      }
      if (this.isOp(",")) {
        const items = [first];
        while (this.eatOp(",")) {
          if (this.isOp(")")) break;
          items.push(this.expr());
        }
        this.expectOp(")");
        return { t: "arr", items };
      }
      this.expectOp(")");
      return first;
    }
    if (t.k === "op" && t.v === "[") {
      this.p++;
      const items: Node[] = [];
      while (!this.isOp("]")) {
        if (this.atEnd()) this.err("'[' was never closed");
        if (this.eatOp("*")) {
          this.expr();
          items.push(unknown("*spread"));
        } else {
          const e = this.expr();
          if (this.isName("for")) {
            this.skipComprehension("]");
            return unknown("a list comprehension");
          }
          items.push(e);
        }
        if (!this.eatOp(",")) break;
      }
      this.expectOp("]");
      return { t: "arr", items };
    }
    if (t.k === "op" && t.v === "{") {
      this.p++;
      const entries: [string | null, Node][] = [];
      while (!this.isOp("}")) {
        if (this.atEnd()) this.err("'{' was never closed");
        if (this.eatOp("**")) entries.push([null, this.expr()]);
        else {
          const k = this.expr();
          if (!this.eatOp(":")) {
            this.skipComprehension("}");
            return unknown("a set");
          }
          const v = this.expr();
          if (this.isName("for")) {
            this.skipComprehension("}");
            return unknown("a dict comprehension");
          }
          const key = k.t === "lit" && (typeof k.v === "string" || typeof k.v === "number") ? String(k.v) : "[computed]";
          entries.push([key, key === "[computed]" ? unknown("a computed key") : v]);
        }
        if (!this.eatOp(",")) break;
      }
      this.expectOp("}");
      return { t: "obj", entries };
    }
    return this.err();
  }
  fstring(s: string, raw: boolean | undefined): (string | Node)[] {
    const parts: (string | Node)[] = [];
    let text = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "{" && s[i + 1] === "{") {
        text += "{";
        i++;
      } else if (ch === "}" && s[i + 1] === "}") {
        text += "}";
        i++;
      } else if (ch === "{") {
        let d = 0;
        let j = i + 1;
        let cut = -1;
        for (; j < s.length; j++) {
          const c = s[j];
          if (c === "(" || c === "[" || c === "{") d++;
          else if (c === ")" || c === "]") d--;
          else if (c === "}") {
            if (d === 0) break;
            d--;
          } else if (d === 0 && cut < 0 && (c === "!" && s[j + 1] !== "=" || c === ":")) cut = j;
        }
        if (j >= s.length) this.err("f-string: expecting '}'");
        const inner = s.slice(i + 1, cut >= 0 ? cut : j).replace(/=$/, "");
        if (text) parts.push(unescape(text, raw));
        text = "";
        parts.push(new ExprParser(tokenize(inner, this.line), this.line).exprAll());
        i = j;
      } else text += ch;
    }
    if (text) parts.push(unescape(text, raw));
    return parts;
  }
  exprAll(): Node {
    const e = this.expr();
    if (!this.atEnd()) this.err();
    return e;
  }
}

/** Splits `tokens` at top-level (depth 0) occurrences of the operator `v`. */
function splitTop(tokens: Tk[], v: string): Tk[][] {
  const out: Tk[][] = [[]];
  let d = 0;
  for (const t of tokens) {
    if (t.k === "op" && "([{".includes(t.v)) d++;
    if (t.k === "op" && ")]}".includes(t.v)) d--;
    if (d === 0 && t.k === "op" && t.v === v) out.push([]);
    else out[out.length - 1].push(t);
  }
  return out;
}

const withEnd = (toks: Tk[]): Tk[] => [...toks, { k: "end", v: "" }];
const exprOf = (toks: Tk[], line: number): Node => new ExprParser(withEnd(toks), line).exprAll();

function parseParams(toks: Tk[], line: number): Param[] {
  const out: Param[] = [];
  for (const part of splitTop(toks, ",")) {
    if (!part.length) continue;
    let rest: Param["rest"];
    let i = 0;
    if (part[0].k === "op" && part[0].v === "**") {
      rest = "kwargs";
      i = 1;
    } else if (part[0].k === "op" && part[0].v === "*") {
      if (part.length === 1) continue;
      rest = "args";
      i = 1;
    } else if (part[0].k === "op" && part[0].v === "/") continue;
    if (part[i]?.k !== "name") throw new PySyntaxError("invalid syntax in parameter list", line);
    const name = part[i].v;
    const eq = part.findIndex((t) => t.k === "op" && t.v === "=");
    out.push({ name, rest, def: eq >= 0 ? exprOf(part.slice(eq + 1), line) : undefined });
  }
  return out;
}

/** The index of the colon that ends a compound statement's header (depth 0), or -1. */
function headerColon(toks: Tk[]): number {
  let d = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.k === "op" && "([{".includes(t.v)) d++;
    else if (t.k === "op" && ")]}".includes(t.v)) d--;
    else if (d === 0 && t.k === "op" && t.v === ":") return i;
  }
  return -1;
}

const COMPOUND = new Set(["class", "def", "if", "elif", "else", "for", "while", "with", "try", "except", "finally", "async"]);

class BlockParser {
  lines: Line[];
  pos = 0;
  constructor(lines: Line[]) {
    this.lines = lines;
  }

  parse(): Stmt[] {
    const first = this.lines[0];
    return first ? this.block(first.indent) : [];
  }

  block(indent: number): Stmt[] {
    const out: Stmt[] = [];
    while (this.pos < this.lines.length) {
      const ln = this.lines[this.pos];
      if (ln.indent < indent) break;
      if (ln.indent > indent) throw new PySyntaxError("IndentationError: unexpected indent", ln.line);
      out.push(...this.statement(ln));
    }
    return out;
  }

  /** Statements of the indented body that follows a header (or the one-liner after the colon). */
  body(header: Line, inline: Tk[]): Stmt[] {
    if (inline.length) return this.simple(inline, header.line);
    const next = this.lines[this.pos];
    if (!next || next.indent <= header.indent) throw new PySyntaxError("IndentationError: expected an indented block", header.line);
    return this.block(next.indent);
  }

  statement(ln: Line): Stmt[] {
    const toks = tokenize(ln.text, ln.line);
    const kw = toks[0].k === "name" ? toks[0].v : "";
    if (ln.text.startsWith("@")) {
      this.pos++;
      return [];
    }
    if (!COMPOUND.has(kw)) {
      this.pos++;
      return this.simple(toks.slice(0, -1), ln.line);
    }
    this.pos++;
    const t = kw === "async" ? toks.slice(1) : toks;
    const word = t[0].v;
    const colon = headerColon(t);
    if (colon < 0) throw new PySyntaxError("invalid syntax (expected ':')", ln.line);
    const head = t.slice(1, colon);
    const inline = t.slice(colon + 1, -1);
    if (word === "class") {
      const name = head[0]?.v ?? "";
      let base: Node | undefined;
      if (head[1]?.v === "(") {
        const args = new ExprParser(withEnd(head.slice(2)), ln.line).callArgs().args;
        base = args[0];
      }
      const body = this.body(ln, inline);
      const init = body.find((s): s is Extract<Stmt, { t: "def" }> => s.t === "def" && s.name === "__init__");
      const methods = body.filter((s): s is Extract<Stmt, { t: "def" }> => s.t === "def" && s.name !== "__init__").map((s) => ({ name: s.name, params: s.params, body: s.body }));
      return [{ t: "class", name, base, params: init?.params ?? [], ctor: init ? init.body : null, methods, line: ln.line }];
    }
    if (word === "def") {
      const name = head[0]?.v ?? "";
      // parameter tokens: between the first "(" and its matching ")"
      let d = 0;
      let end = -1;
      for (let i = 1; i < head.length; i++) {
        if (head[i].v === "(") d++;
        if (head[i].v === ")") {
          d--;
          if (d === 0) {
            end = i;
            break;
          }
        }
      }
      if (end < 0) throw new PySyntaxError("invalid syntax in def", ln.line);
      return [{ t: "def", name, params: parseParams(head.slice(2, end), ln.line), body: this.body(ln, inline), line: ln.line }];
    }
    if (word === "if") {
      const cond = exprOf(head, ln.line);
      const then = this.body(ln, inline);
      let other: Stmt[] = [];
      const next = this.lines[this.pos];
      if (next && next.indent === ln.indent && /^(elif|else)\b/.test(next.text)) other = this.elseChain(next);
      return [{ t: "if", cond, then, else: other, line: ln.line }];
    }
    if (word === "for" || word === "while") {
      const body = this.body(ln, inline);
      const inAt = head.findIndex((t) => t.k === "name" && t.v === "in");
      if (word === "for" && inAt === 1 && head[0].k === "name") {
        return [{ t: "for", variable: head[0].v, iter: exprOf(head.slice(inAt + 1), ln.line), body, line: ln.line }];
      }
      return [{ t: "skip", what: "loops", line: ln.line }];
    }
    if (word === "with" || word === "try") {
      const body = this.body(ln, inline);
      this.skipClauses(ln);
      return body;
    }
    // stray elif/else/except/finally
    throw new PySyntaxError(`invalid syntax ('${word}' without a matching statement)`, ln.line);
  }

  elseChain(ln: Line): Stmt[] {
    const toks = tokenize(ln.text, ln.line);
    const colon = headerColon(toks);
    if (colon < 0) throw new PySyntaxError("invalid syntax (expected ':')", ln.line);
    this.pos++;
    const inline = toks.slice(colon + 1, -1);
    if (toks[0].v === "else") return this.body(ln, inline);
    const cond = exprOf(toks.slice(1, colon), ln.line);
    const then = this.body(ln, inline);
    let other: Stmt[] = [];
    const next = this.lines[this.pos];
    if (next && next.indent === ln.indent && /^(elif|else)\b/.test(next.text)) other = this.elseChain(next);
    return [{ t: "if", cond, then, else: other, line: ln.line }];
  }

  skipClauses(ln: Line) {
    for (;;) {
      const next = this.lines[this.pos];
      if (!next || next.indent !== ln.indent || !/^(except|finally|else)\b/.test(next.text)) return;
      const toks = tokenize(next.text, next.line);
      this.pos++;
      const colon = headerColon(toks);
      this.body(next, colon >= 0 ? toks.slice(colon + 1, -1) : []);
    }
  }

  simple(toks: Tk[], line: number): Stmt[] {
    const out: Stmt[] = [];
    for (const part of splitTop(toks, ";")) {
      if (part.length) out.push(...this.one(part, line));
    }
    return out;
  }

  one(toks: Tk[], line: number): Stmt[] {
    const first = toks[0];
    if (first.k === "name") {
      switch (first.v) {
        case "import": {
          const out: Stmt[] = [];
          for (const part of splitTop(toks.slice(1), ",")) {
            const as = part.findIndex((t) => t.k === "name" && t.v === "as");
            const mod = (as >= 0 ? part.slice(0, as) : part).map((t) => t.v).join("");
            const alias = as >= 0 ? part[as + 1]?.v : mod.split(".")[0];
            out.push({ t: "import", module: mod, alias: as >= 0 ? alias : mod, names: [], line });
          }
          return out;
        }
        case "from": {
          const imp = toks.findIndex((t) => t.k === "name" && t.v === "import");
          if (imp < 0) throw new PySyntaxError("invalid syntax (expected 'import')", line);
          const mod = toks.slice(1, imp).map((t) => t.v).join("");
          let rest = toks.slice(imp + 1);
          if (rest[0]?.v === "(") rest = rest.slice(1, rest.findIndex((t) => t.v === ")") < 0 ? undefined : rest.findIndex((t) => t.v === ")"));
          const names: [string, string][] = [];
          for (const part of splitTop(rest, ",")) {
            if (!part.length || part[0].v === "*") continue;
            const as = part.findIndex((t) => t.k === "name" && t.v === "as");
            names.push([part[0].v, as >= 0 ? part[as + 1].v : part[0].v]);
          }
          return [{ t: "import", module: mod, names, line }];
        }
        case "break":
        case "continue":
          return [{ t: "jump", kind: first.v as "break" | "continue", line }];
        case "return":
          return [{ t: "return", value: toks.length > 1 ? exprOf(toks.slice(1), line) : undefined, line }];
        case "pass":
        case "global":
        case "nonlocal":
        case "raise":
          return [{ t: "throw", line }];
        case "del":
        case "assert":
          return [];
      }
    }
    // assignment: the first top-level "=" (not inside brackets); annotations `x: T = v` are dropped
    const eq = (() => {
      let d = 0;
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if (t.k === "op" && "([{".includes(t.v)) d++;
        else if (t.k === "op" && ")]}".includes(t.v)) d--;
        else if (d === 0 && t.k === "op" && t.v === "=") return i;
      }
      return -1;
    })();
    const aug = toks.find((t) => t.k === "op" && ["+=", "-=", "*=", "/=", "%=", "**=", "//="].includes(t.v));
    if (aug && eq < 0) return [{ t: "skip", what: "augmented assignment", line }];
    if (eq > 0) {
      let target = toks.slice(0, eq);
      const colon = splitTop(target, ":");
      if (colon.length > 1) target = colon[0];
      if (splitTop(target, ",").length > 1) return [{ t: "skip", what: "tuple assignment", line }];
      let valueToks = toks.slice(eq + 1);
      // chained assignment `a = b = value`: bind to the first target
      const chain = splitTop(valueToks, "=");
      if (chain.length > 1) valueToks = chain[chain.length - 1];
      return [{ t: "assign", target: exprOf(target, line), value: exprOf(valueToks, line), line }];
    }
    if (splitTop(toks, ":").length > 1) return []; // bare annotation `x: int`
    const e = exprOf(toks, line);
    if (e.t === "lit" || e.t === "tpl") return []; // docstring
    return [{ t: "expr", value: e, line }];
  }
}

export function parsePython(code: string): ParseResult {
  try {
    return { ok: true, stmts: new BlockParser(logicalLines(code)).parse() };
  } catch (error) {
    if (error instanceof PySyntaxError) {
      const msg = error.message.startsWith("IndentationError") ? error.message : `SyntaxError: ${error.message}`;
      return { ok: false, message: `${msg} (line ${error.line})`, line: error.line };
    }
    throw error;
  }
}
