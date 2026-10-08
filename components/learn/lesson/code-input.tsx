"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FiLock } from "react-icons/fi";
import { tokenize } from "./code-block";

type Props = {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  /** 1-based line the learner may edit; every other line is locked. */
  editableLine?: number | null;
  onRun?: () => void;
  label: string;
  /** Highlighting and indentation rules; defaults to TypeScript/JavaScript. */
  language?: string;
};

/**
 * A light, mobile-friendly code editor: a transparent textarea over a highlighted <pre>.
 * Both use identical metrics and wrapping so the caret lines up with the colours.
 */
export function CodeInput({ value, onChange, readOnly, editableLine, onRun, label, language }: Props) {
  const python = language === "python";
  const indentUnit = python ? "    " : "  ";
  const ref = useRef<HTMLTextAreaElement>(null);
  const [locked, setLocked] = useState(0);
  const escaped = useRef(false);
  const lockTimer = useRef<number | undefined>(undefined);

  const lines = useMemo(() => {
    const toks = tokenize(value, language);
    const out: { t: string; v: string }[][] = [[]];
    for (const tk of toks) {
      const parts = tk.v.split("\n");
      parts.forEach((part, i) => {
        if (i > 0) out.push([]);
        if (part) out[out.length - 1].push({ t: tk.t, v: part });
      });
    }
    return out;
  }, [value, language]);

  const accept = (next: string) => {
    if (!editableLine) return true;
    const a = value.split("\n");
    const b = next.split("\n");
    if (a.length !== b.length) return false;
    return a.every((line, i) => i === editableLine - 1 || line === b[i]);
  };

  const commit = (next: string, caret?: number) => {
    if (!accept(next)) {
      setLocked((n) => n + 1);
      window.clearTimeout(lockTimer.current);
      lockTimer.current = window.setTimeout(() => setLocked(0), 1800);
      return;
    }
    onChange?.(next);
    if (caret != null) requestAnimationFrame(() => ref.current?.setSelectionRange(caret, caret));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.();
      return;
    }
    if (e.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (readOnly) return;
    const { selectionStart: s, selectionEnd: end } = el;
    if (e.key === "Tab" && !e.shiftKey && !escaped.current) {
      e.preventDefault();
      commit(value.slice(0, s) + indentUnit + value.slice(end), s + indentUnit.length);
    } else if (e.key === "Enter" && !editableLine) {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const indent = /^\s*/.exec(value.slice(lineStart, s))?.[0] ?? "";
      const before = value.slice(lineStart, s);
      const extra = (python ? /[:{[(]\s*$/ : /[{[(]\s*$/).test(before) ? indentUnit : "";
      const ins = "\n" + indent + extra;
      commit(value.slice(0, s) + ins + value.slice(end), s + ins.length);
    }
    escaped.current = false;
  };

  const editable = Boolean(editableLine);
  const hintId = useId();

  return (
    <div className="relative">
      <div className="relative">
        <pre aria-hidden className="sc-code sc-editor pointer-events-none m-0 whitespace-pre-wrap break-words py-4 pl-[3.25rem] pr-5">
          {lines.map((line, i) => {
            const n = i + 1;
            const isEdit = editable && n === editableLine;
            return (
              <div key={i} data-n={n} className={`sc-line ${editable && !isEdit ? "is-locked" : ""} ${isEdit ? "is-edit" : ""}`}>
                {line.length ? line.map((tk, j) => (tk.t ? <span key={j} className={`t-${tk.t}`}>{tk.v}</span> : tk.v)) : "​"}
              </div>
            );
          })}
        </pre>
        <textarea
          ref={ref}
          aria-label={label}
          aria-describedby={readOnly ? undefined : hintId}
          value={value}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          onChange={(e) => commit(e.target.value)}
          onKeyDown={onKeyDown}
          style={{ color: "transparent" }}
          className="sc-code absolute inset-0 m-0 h-full w-full resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent py-4 pl-[3.25rem] pr-5 text-transparent caret-[#7fdbca] outline-none selection:bg-[#3b4252] selection:text-transparent"
        />
      </div>
      {!readOnly && (
        <span id={hintId} className="sr-only">
          Tab inserts {python ? "four" : "two"} spaces. Press Escape, then Tab, to leave the editor. Control or Command plus Enter runs the code.
          {editableLine ? ` Only line ${editableLine} can be edited.` : ""}
        </span>
      )}
      {locked > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center">
          <p key={locked} role="status" className="sc-shake inline-flex items-center gap-2 rounded-full bg-[#111214] px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--sc-shadow-lg)] ring-1 ring-white/10">
            <FiLock className="h-3.5 w-3.5 text-[#7fdbca]" /> Only the highlighted line is editable
          </p>
        </div>
      )}
    </div>
  );
}
