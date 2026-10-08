"use client";

import { useState, type ReactNode } from "react";
import { FiAlertCircle, FiCheckCircle, FiChevronDown, FiEye, FiPlay, FiRotateCcw, FiTarget } from "react-icons/fi";
import { CodeInput } from "./code-input";
import { HighlightedCode } from "./code-block";

export type RunOutput = { ok: boolean; title: string; detail?: string; data?: string } | null;

/** Turns the legacy "✅/❌ message\n\nmore" strings into a structured result. */
export function toOutput(text: string, ok?: boolean): RunOutput {
  const clean = text.trim();
  const isErr = ok === false || /^(❌|Error)/.test(clean);
  const [first, ...rest] = clean.replace(/^(❌|✅)\s*/, "").split("\n");
  const body = rest.join("\n").trim();
  const jsonAt = body.search(/\n?[[{]\s*\n/);
  const detail = jsonAt > 0 ? body.slice(0, jsonAt).trim() : jsonAt === 0 ? "" : body;
  const data = jsonAt >= 0 ? body.slice(jsonAt).trim() : undefined;
  return { ok: ok ?? !isErr, title: first.replace(/:$/, ""), detail: detail || undefined, data };
}

/**
 * The practice surface shared by every quest: a dark editor with Problem / Reference
 * tabs, a run bar, and a result panel. `after` renders under the result (the trace replay).
 */
export function Workbench({
  code,
  onCode,
  solution,
  goal,
  editableLine,
  running,
  onRun,
  onReset,
  output,
  runLabel = "Run code",
  after,
  language,
  headerExtra,
}: {
  code: string;
  onCode: (c: string) => void;
  solution: string;
  goal?: ReactNode;
  editableLine?: number | null;
  running: boolean;
  onRun: () => void;
  onReset: () => void;
  output: RunOutput;
  runLabel?: string;
  after?: ReactNode;
  /** Highlighting and indentation for the editor ("typescript" by default). */
  language?: string;
  /** Extra controls in the editor's header, e.g. a language switch. */
  headerExtra?: ReactNode;
}) {
  const [tab, setTab] = useState<"code" | "solution">("code");
  const [showData, setShowData] = useState(true);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="overflow-hidden rounded-[22px] bg-[var(--sc-code-bg)] shadow-[var(--sc-shadow-lg)] ring-1 ring-black/20">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-3 py-2.5">
          <div role="tablist" aria-label="Editor" className="flex rounded-xl bg-white/[0.05] p-1">
            {(
              [
                ["code", "Your code"],
                ["solution", "Reference solution"],
              ] as const
            ).map(([id, text]) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  tab === id ? "bg-white/[0.12] text-white shadow-sm" : "text-white/55 hover:text-white/85"
                }`}
              >
                {id === "solution" && <FiEye className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{text}</span>
                <span className="sm:hidden">{id === "code" ? "Code" : "Solution"}</span>
              </button>
            ))}
          </div>
          {headerExtra}
          {tab === "code" && (
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white/55 transition hover:bg-white/10 hover:text-white">
              <FiRotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>

        {goal && tab === "code" && (
          <div className="flex items-start gap-2.5 border-b border-white/[0.07] bg-[#7fdbca]/[0.06] px-5 py-3 text-[13px] leading-relaxed text-white/75 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-[#7fdbca] [&_strong]:text-white">
            <FiTarget aria-hidden className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#7fdbca]" />
            <span>{goal}</span>
          </div>
        )}

        <div role="tabpanel" className="max-h-[560px] overflow-auto">
          {tab === "code" ? (
            <CodeInput value={code} onChange={onCode} editableLine={editableLine} onRun={onRun} label="Your code" language={language} />
          ) : (
            <CodeInput value={solution} readOnly label="Reference solution" language={language} />
          )}
        </div>

        {tab === "code" && (
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3">
            <span className="hidden text-[12px] text-white/60 sm:inline">
              <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-sans">Ctrl/⌘</kbd> <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-sans">Enter</kbd> to run · simulated, no AWS calls
            </span>
            <span className="text-[12px] text-white/60 sm:hidden">Simulated — no AWS calls</span>
            <button
              type="button"
              onClick={onRun}
              disabled={running || !code.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#2fd3b0] px-5 text-[13.5px] font-bold text-[#06231d] shadow-[0_6px_20px_-6px_rgba(47,211,176,.7)] transition hover:-translate-y-px hover:bg-[#4be0c0] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#06231d]/30 border-t-[#06231d]" /> : <FiPlay className="h-3.5 w-3.5 fill-current" />}
              {running ? "Running…" : runLabel}
            </button>
          </div>
        )}
      </div>

      {output && (
        <div
          role="status"
          aria-live="polite"
          className={`sc-rise overflow-hidden rounded-[20px] border bg-white shadow-[var(--sc-shadow-sm)] ${output.ok ? "border-emerald-200" : "border-rose-200"}`}
        >
          <div className={`flex items-start gap-3 px-5 py-4 ${output.ok ? "bg-emerald-50/70" : "bg-rose-50/70"}`}>
            {output.ok ? <FiCheckCircle className="sc-pop mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
            <div className="min-w-0">
              <p className={`text-[15px] font-semibold ${output.ok ? "text-emerald-950" : "text-rose-950"}`}>{output.title}</p>
              {output.detail && <p className={`mt-1 whitespace-pre-line text-[14px] leading-relaxed ${output.ok ? "text-emerald-900/75" : "text-rose-900/80"}`}>{output.detail}</p>}
            </div>
          </div>
          {output.data && (
            <div className="border-t border-[#efebe1]">
              <button type="button" aria-expanded={showData} onClick={() => setShowData((s) => !s)} className="flex w-full items-center justify-between px-5 py-2.5 text-[12.5px] font-semibold text-[var(--sc-ink-3)] hover:bg-[#fbfaf6]">
                Response data
                <FiChevronDown className={`h-4 w-4 transition-transform ${showData ? "rotate-180" : ""}`} />
              </button>
              {showData && (
                <pre className="sc-code max-h-72 overflow-auto bg-[var(--sc-code-bg)] px-5 py-4 text-[12.5px]">
                  <HighlightedCode code={output.data} />
                </pre>
              )}
            </div>
          )}
        </div>
      )}
      {after}
    </div>
  );
}
