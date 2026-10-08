"use client";

import { useMemo, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";
import { CODE_LANGUAGES, LANGUAGE_LABEL, useCodeLanguage, type CodeLanguage } from "./code-language";

const KEYWORDS = new Set(
  "const let var function async await return if else for while do of in new try catch finally throw import from export default class extends typeof instanceof null undefined true false this break continue switch case yield".split(" ")
);

const PY_KEYWORDS = new Set(
  "and as assert async await break class continue def del elif else except finally for from global if import in is lambda None nonlocal not or pass raise return try while with yield True False self".split(" ")
);

type Token = { t: string; v: string };

/** Tiny JS/TS/JSON tokenizer: enough for readable, dependency-free snippets. */
export function tokenize(code: string, language: string = "typescript"): Token[] {
  if (language === "python") return tokenizePython(code);
  const out: Token[] = [];
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|\$\{[^}]*\}|\$(?!\{)|[^`\\$])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()[\]])|(=>|===|!==|==|&&|\|\||[=+\-*/<>!?:.,;&|])|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const [v, com, str, num, id, br, op] = m;
    if (com) out.push({ t: "c", v });
    else if (str) {
      const rest = code.slice(re.lastIndex);
      out.push({ t: /^\s*:/.test(rest) ? "p" : "s", v });
    } else if (num) out.push({ t: "n", v });
    else if (id) {
      const rest = code.slice(re.lastIndex);
      if (KEYWORDS.has(id)) out.push({ t: "k", v });
      else if (/^\s*\(/.test(rest)) out.push({ t: "f", v });
      else if (/^\s*:(?!:)/.test(rest)) out.push({ t: "p", v });
      else out.push({ t: "", v });
    } else if (br) out.push({ t: "b", v });
    else if (op) out.push({ t: "o", v });
    else out.push({ t: "", v });
  }
  return out;
}

/** Tiny Python tokenizer: comments, (triple-quoted) strings, numbers, keywords, calls and keyword arguments. */
function tokenizePython(code: string): Token[] {
  const out: Token[] = [];
  const re = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|[fFrRbB]{0,2}"(?:\\.|[^"\\\n])*"|[fFrRbB]{0,2}'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)|([{}()[\]])|(->|==|!=|<=|>=|\*\*|[=+\-*/<>!?:.,;&|%@])|(\s+)|(.)/g;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const [v, com, str, num, id, br, op] = m;
    if (com) out.push({ t: "c", v });
    else if (str) out.push({ t: "s", v });
    else if (num) out.push({ t: "n", v });
    else if (id) {
      const rest = code.slice(re.lastIndex);
      if (PY_KEYWORDS.has(id)) out.push({ t: "k", v });
      else if (/^\s*\(/.test(rest)) out.push({ t: "f", v });
      else if (depth > 0 && /^\s*=(?!=)/.test(rest)) out.push({ t: "p", v });
      else out.push({ t: "", v });
    } else if (br) {
      if (v === "(" || v === "[" || v === "{") depth++;
      else depth = Math.max(0, depth - 1);
      out.push({ t: "b", v });
    } else if (op) out.push({ t: "o", v });
    else out.push({ t: "", v });
  }
  return out;
}

export function HighlightedCode({ code, language }: { code: string; language?: string }) {
  const tokens = useMemo(() => tokenize(code, language), [code, language]);
  return (
    <code>
      {tokens.map((tk, i) => (tk.t ? <span key={i} className={`t-${tk.t}`}>{tk.v}</span> : tk.v))}
    </code>
  );
}

const LANG_LABEL: Record<string, string> = { javascript: "JavaScript", js: "JavaScript", ts: "TypeScript", typescript: "TypeScript", python: "Python", py: "Python", json: "JSON", bash: "Shell", yaml: "YAML" };

export function CodeBlock({
  code: single,
  language: singleLanguage,
  label,
  variants,
}: {
  code: string;
  language?: string;
  label?: string;
  /** The same snippet in several languages; the reader's saved language picks the tab. */
  variants?: { language: string; code: string }[];
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useCodeLanguage();
  const tabs = variants && variants.length > 1 ? variants : null;
  const shown = tabs ? tabs.find((v) => v.language === saved) ?? tabs[0] : null;
  const code = shown ? shown.code : single;
  const language = shown ? shown.language : singleLanguage;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard can be unavailable (permissions, insecure origin); nothing to do. */
    }
  };
  return (
    <figure className="group/code not-prose my-7 overflow-hidden rounded-2xl bg-[var(--sc-code-bg)] shadow-[var(--sc-shadow-md)] ring-1 ring-black/10">
      <figcaption className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-white/[0.14]" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/[0.14]" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/[0.14]" />
          </span>
          {label && <span className="truncate text-[12px] font-medium text-white/70">{label}</span>}
        </span>
        <span className="flex items-center gap-2">
          {tabs ? (
            <span role="group" aria-label="Language" className="flex rounded-lg bg-white/[0.06] p-0.5">
              {tabs
                .filter((v): v is { language: CodeLanguage; code: string } => CODE_LANGUAGES.includes(v.language as CodeLanguage))
                .map((v) => (
                  <button
                    key={v.language}
                    type="button"
                    aria-pressed={shown?.language === v.language}
                    onClick={() => setSaved(v.language)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${shown?.language === v.language ? "bg-white/[0.14] text-white" : "text-white/50 hover:text-white/80"}`}
                  >
                    {LANGUAGE_LABEL[v.language]}
                  </button>
                ))}
            </span>
          ) : (
            language && <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/50">{LANG_LABEL[language] ?? language}</span>
          )}
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy code"}
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {copied ? <FiCheck className="h-3.5 w-3.5 text-emerald-300" /> : <FiCopy className="h-3.5 w-3.5" />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
        </span>
      </figcaption>
      <pre tabIndex={0} className="sc-code overflow-x-auto px-5 py-4 focus-visible:outline-none">
        <HighlightedCode code={code} language={language} />
      </pre>
    </figure>
  );
}
