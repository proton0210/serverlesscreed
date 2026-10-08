"use client";

import { useMemo, useState } from "react";
import type { TraceEvent } from "@/lib/dynamodb/trace";
import { wireAt } from "@/lib/dynamodb/wire";

/** Syntax-coloured JSON: keys, DynamoDB type descriptors (S, N, BOOL), strings, numbers. */
function Json({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  const parts = text.split(/("(?:\\.|[^"\\])*"(?:\s*:)?|-?\d+(?:\.\d+)?|\btrue\b|\bfalse\b)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^"(S|N|BOOL|M|L)"\s*:$/.test(p)) return <span key={i} className="text-fuchsia-300">{p}</span>;
        if (/^".*"\s*:$/.test(p)) return <span key={i} className="text-sky-300">{p}</span>;
        if (/^"/.test(p)) return <span key={i} className="text-amber-200">{p}</span>;
        if (/^-?\d/.test(p) || p === "true" || p === "false") return <span key={i} className="text-emerald-300">{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/**
 * The HTTP exchange behind the current step, in DynamoDB's low-level JSON format.
 * Updates as the scene plays; the response appears once the step reaches it.
 */
export function WireView({ events, index, defaultOpen = false }: { events: TraceEvent[]; index: number; defaultOpen?: boolean }) {
  const wire = useMemo(() => wireAt(events, index), [events, index]);
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<"request" | "response">("request");
  const [copied, setCopied] = useState(false);
  if (!wire) return null;
  const statusText = wire.status ? `${wire.status} ${wire.status === 200 ? "OK" : "Bad Request"}` : "pending…";
  const body = tab === "request" ? wire.request : wire.response;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(body ?? {}, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950 text-stone-200 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-mono text-xs transition hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-400"
      >
        <span className="rounded bg-cyan-400/[0.15] px-1.5 py-0.5 font-semibold text-cyan-300">POST</span>
        <span className="truncate text-stone-300">{wire.target}</span>
        <span
          className={`ml-auto rounded px-1.5 py-0.5 font-semibold ${
            wire.status === 200 ? "bg-emerald-400/[0.15] text-emerald-300" : wire.status ? "bg-red-400/[0.15] text-red-300" : "bg-stone-700/[0.6] text-stone-300"
          }`}
        >
          {statusText}
        </span>
        <span aria-hidden className={`text-stone-400 transition-transform ${open ? "rotate-90" : ""}`}>
          ▸
        </span>
        <span className="sr-only">{open ? "Hide" : "Show"} the API call</span>
      </button>
      {open && (
        <div className="border-t border-stone-800">
          <div className="flex items-center gap-1 border-b border-stone-800 px-2 py-1.5 font-mono text-[11px]">
            {(["request", "response"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`rounded-md px-2.5 py-1 capitalize transition ${tab === t ? "bg-stone-800 text-white" : "text-stone-400 hover:text-stone-200"}`}
              >
                {t}
              </button>
            ))}
            <span className="ml-2 hidden text-stone-400 sm:inline">dynamodb.ap-south-1.amazonaws.com · X-Amz-Target: {wire.target}</span>
            <button type="button" onClick={copy} className="ml-auto rounded-md px-2.5 py-1 text-stone-400 transition hover:bg-stone-800 hover:text-white">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre tabIndex={0} className="max-h-72 overflow-auto px-4 py-3 font-mono text-[12px] leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-400">
            {body ? <Json value={body} /> : <span className="text-stone-400">Waiting for DynamoDB to respond…</span>}
          </pre>
          <p className="border-t border-stone-800 px-4 py-1.5 text-[10.5px] text-stone-400">Simulated exchange in DynamoDB&apos;s JSON wire format. Nothing is sent to AWS.</p>
        </div>
      )}
    </div>
  );
}
