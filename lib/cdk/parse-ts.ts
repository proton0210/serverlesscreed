/**
 * TypeScript → IR using the TypeScript compiler's parser (syntax only: no type checking, no emit, no execution).
 * Keep this file free of path aliases and JSX.
 */
import ts from "typescript";
import { lit, unknown } from "./ir.ts";
import type { Node, Param, ParseResult, Stmt } from "./ir.ts";

type Ctx = { sf: ts.SourceFile };

const line = (c: Ctx, n: ts.Node) => c.sf.getLineAndCharacterOfPosition(n.getStart(c.sf)).line + 1;

export function parseTs(code: string): ParseResult {
  const sf = ts.createSourceFile("stack.ts", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
  if (diagnostics.length) {
    const d = diagnostics[0];
    const at = sf.getLineAndCharacterOfPosition(d.start ?? 0).line + 1;
    return { ok: false, message: `error TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")} (line ${at})`, line: at };
  }
  const c: Ctx = { sf };
  return { ok: true, stmts: sf.statements.flatMap((s) => stmt(c, s)) };
}

function block(c: Ctx, n: ts.Statement | undefined): Stmt[] {
  if (!n) return [];
  if (ts.isBlock(n)) return n.statements.flatMap((s) => stmt(c, s));
  return stmt(c, n);
}

function params(c: Ctx, list: readonly ts.ParameterDeclaration[]): Param[] {
  return list.map((p) => ({
    name: ts.isIdentifier(p.name) ? p.name.text : "_",
    def: p.initializer ? expr(c, p.initializer) : undefined,
    rest: p.dotDotDotToken ? ("args" as const) : undefined,
  }));
}

function stmt(c: Ctx, n: ts.Statement): Stmt[] {
  const ln = line(c, n);
  if (ts.isImportDeclaration(n)) {
    const mod = ts.isStringLiteral(n.moduleSpecifier) ? n.moduleSpecifier.text : "";
    const clause = n.importClause;
    const names: [string, string][] = [];
    let alias: string | undefined;
    if (clause?.name) alias = clause.name.text;
    const nb = clause?.namedBindings;
    if (nb && ts.isNamespaceImport(nb)) alias = nb.name.text;
    if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) names.push([(e.propertyName ?? e.name).text, e.name.text]);
    return [{ t: "import", module: mod, alias, names, line: ln }];
  }
  if (ts.isClassDeclaration(n)) {
    const ext = n.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword)?.types[0];
    const ctor = n.members.find((m): m is ts.ConstructorDeclaration => ts.isConstructorDeclaration(m));
    return [
      {
        t: "class",
        name: n.name?.text ?? "(anonymous)",
        base: ext ? expr(c, ext.expression) : undefined,
        params: ctor ? params(c, ctor.parameters) : [],
        ctor: ctor?.body ? ctor.body.statements.flatMap((s) => stmt(c, s)) : null,
        methods: n.members
          .filter((m): m is ts.MethodDeclaration => ts.isMethodDeclaration(m) && Boolean(m.body) && ts.isIdentifier(m.name))
          .map((m) => ({ name: (m.name as ts.Identifier).text, params: params(c, m.parameters), body: (m.body as ts.Block).statements.flatMap((s) => stmt(c, s)) })),
        line: ln,
      },
    ];
  }
  if (ts.isFunctionDeclaration(n) && n.name) return [{ t: "def", name: n.name.text, params: params(c, n.parameters), body: n.body ? n.body.statements.flatMap((s) => stmt(c, s)) : [], line: ln }];
  if (ts.isVariableStatement(n)) {
    const out: Stmt[] = [];
    for (const d of n.declarationList.declarations) {
      if (!d.initializer) continue;
      if (ts.isIdentifier(d.name)) out.push({ t: "assign", target: { t: "id", name: d.name.text }, value: expr(c, d.initializer), line: ln });
      else if (ts.isObjectBindingPattern(d.name)) {
        const names: [string, string][] = d.name.elements.map((e) => [((e.propertyName ?? e.name) as ts.Identifier).text, (e.name as ts.Identifier).text]);
        out.push({ t: "destructure", names, value: expr(c, d.initializer), line: ln });
      } else out.push({ t: "skip", what: "this kind of destructuring", line: ln });
    }
    return out;
  }
  if (ts.isExpressionStatement(n)) {
    const e = n.expression;
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken) return [{ t: "assign", target: expr(c, e.left), value: expr(c, e.right), line: ln }];
    return [{ t: "expr", value: expr(c, e), line: ln }];
  }
  if (ts.isIfStatement(n)) return [{ t: "if", cond: expr(c, n.expression), then: block(c, n.thenStatement), else: block(c, n.elseStatement), line: ln }];
  if (ts.isBlock(n)) return n.statements.flatMap((s) => stmt(c, s));
  if (ts.isReturnStatement(n)) return [{ t: "return", value: n.expression ? expr(c, n.expression) : undefined, line: ln }];
  if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isEnumDeclaration(n) || ts.isExportDeclaration(n) || ts.isEmptyStatement(n)) return [];
  if (ts.isThrowStatement(n)) return [{ t: "throw", line: ln }];
  if (ts.isBreakStatement(n)) return [{ t: "jump", kind: "break", line: ln }];
  if (ts.isContinueStatement(n)) return [{ t: "jump", kind: "continue", line: ln }];
  if (ts.isForOfStatement(n) && ts.isVariableDeclarationList(n.initializer) && n.initializer.declarations.length === 1 && ts.isIdentifier(n.initializer.declarations[0].name)) {
    return [{ t: "for", variable: n.initializer.declarations[0].name.text, iter: expr(c, n.expression), body: block(c, n.statement), line: ln }];
  }
  if (ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n)) return [{ t: "skip", what: "loops", line: ln }];
  if (ts.isTryStatement(n)) return n.tryBlock.statements.flatMap((s) => stmt(c, s));
  return [{ t: "skip", what: ts.SyntaxKind[n.kind], line: ln }];
}

function expr(c: Ctx, n: ts.Expression): Node {
  if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) || ts.isTypeAssertionExpression(n) || ts.isSatisfiesExpression(n)) return expr(c, n.expression);
  if (ts.isIdentifier(n)) return n.text === "undefined" ? lit(undefined) : { t: "id", name: n.text };
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return lit(n.text);
  if (ts.isNumericLiteral(n)) return lit(Number(n.text));
  if (n.kind === ts.SyntaxKind.TrueKeyword) return lit(true);
  if (n.kind === ts.SyntaxKind.FalseKeyword) return lit(false);
  if (n.kind === ts.SyntaxKind.NullKeyword) return lit(null);
  if (n.kind === ts.SyntaxKind.ThisKeyword) return { t: "id", name: "this" };
  if (n.kind === ts.SyntaxKind.SuperKeyword) return { t: "id", name: "super" };
  if (ts.isTemplateExpression(n)) {
    const parts: (string | Node)[] = [n.head.text];
    for (const s of n.templateSpans) parts.push(expr(c, s.expression), s.literal.text);
    return { t: "tpl", parts };
  }
  if (ts.isArrayLiteralExpression(n)) return { t: "arr", items: n.elements.map((e) => (ts.isSpreadElement(e) ? unknown("spread in an array") : expr(c, e))) };
  if (ts.isObjectLiteralExpression(n)) {
    const entries: [string | null, Node][] = [];
    for (const p of n.properties) {
      if (ts.isPropertyAssignment(p)) {
        const k = p.name;
        const key = ts.isIdentifier(k) || ts.isStringLiteral(k) || ts.isNumericLiteral(k) ? k.text : ts.isComputedPropertyName(k) && ts.isStringLiteral(k.expression) ? k.expression.text : null;
        if (key !== null) entries.push([key, expr(c, p.initializer)]);
        else entries.push([`[computed]`, unknown("a computed key")]);
      } else if (ts.isShorthandPropertyAssignment(p)) entries.push([p.name.text, { t: "id", name: p.name.text }]);
      else if (ts.isSpreadAssignment(p)) entries.push([null, expr(c, p.expression)]);
    }
    return { t: "obj", entries };
  }
  if (ts.isPropertyAccessExpression(n)) return { t: "mem", obj: expr(c, n.expression), prop: n.name.text };
  if (ts.isElementAccessExpression(n)) {
    const a = n.argumentExpression;
    return ts.isStringLiteral(a) ? { t: "mem", obj: expr(c, n.expression), prop: a.text } : { t: "idx", obj: expr(c, n.expression), index: expr(c, a) };
  }
  if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
    const args = (n.arguments ?? []).map((a) => (ts.isSpreadElement(a) ? unknown("spread argument") : expr(c, a)));
    return { t: "call", fn: expr(c, n.expression), args, kw: [], isNew: ts.isNewExpression(n) };
  }
  if (ts.isPrefixUnaryExpression(n)) {
    const op = n.operator === ts.SyntaxKind.ExclamationToken ? "!" : n.operator === ts.SyntaxKind.MinusToken ? "-" : n.operator === ts.SyntaxKind.PlusToken ? "+" : "?";
    return { t: "un", op, e: expr(c, n.operand) };
  }
  if (ts.isBinaryExpression(n)) return { t: "bin", op: n.operatorToken.getText(c.sf), l: expr(c, n.left), r: expr(c, n.right) };
  if (ts.isConditionalExpression(n)) return { t: "cond", c: expr(c, n.condition), a: expr(c, n.whenTrue), b: expr(c, n.whenFalse) };
  if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
    const body: Stmt[] = ts.isBlock(n.body) ? n.body.statements.flatMap((s) => stmt(c, s)) : [{ t: "return", value: expr(c, n.body as ts.Expression), line: line(c, n) }];
    return { t: "fn", params: params(c, n.parameters), body };
  }
  return unknown(ts.SyntaxKind[n.kind]);
}
