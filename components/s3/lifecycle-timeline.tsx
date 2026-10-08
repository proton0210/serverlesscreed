"use client";

import { useState } from "react";

const STAGES = [
  { from: 0, to: 30, label: "STANDARD", color: "#1f9d6b", note: "Watched often in the first month." },
  { from: 30, to: 365, label: "STANDARD_IA", color: "#8a5cc7", note: "Cheaper storage, per-GB retrieval fee. Minimum 30 days here." },
  { from: 365, to: 400, label: "Expired", color: "#b9b2a2", note: "Deleted by the rule. (With versioning on, this adds a delete marker instead.)" },
];

const MAX = 400;

/** Drag through a replay's life under the lifecycle rule from Quest 9. */
export function LifecycleTimeline() {
  const [day, setDay] = useState(45);
  const stage = STAGES.find((s) => day >= s.from && day < s.to) ?? STAGES[STAGES.length - 1];
  const abortShown = day >= 7;

  return (
    <div aria-label="Lifecycle timeline" className="rounded-[22px] border border-[var(--sc-line)] bg-gradient-to-b from-white to-[#f6f3ec] p-5 shadow-[var(--sc-shadow-sm)] sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-accent)]">Try it · A replay&apos;s year</p>
      <p className="mt-1 text-[14px] text-[var(--sc-ink-3)]">
        Rule on <code className="sc-inline">replays/</code>: Standard-IA at 30 days, expire at 365, abort unfinished uploads after 7.
      </p>

      <div className="relative mt-6 h-10 overflow-hidden rounded-xl" aria-hidden>
        {STAGES.map((s) => (
          <div key={s.label} className="absolute inset-y-0 grid place-items-center text-[11px] font-bold text-white" style={{ left: `${(s.from / MAX) * 100}%`, width: `${((s.to - s.from) / MAX) * 100}%`, background: s.color, opacity: s === stage ? 1 : 0.45 }}>
            <span className="truncate px-1">{s.to - s.from > 60 ? s.label : ""}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-[var(--sc-ink)] transition-[left]" style={{ left: `${(day / MAX) * 100}%` }} />
      </div>
      <div className="relative mt-1 h-4 font-mono text-[11px] text-[var(--sc-ink-3)]" aria-hidden>
        {[0, 30, 365].map((d) => (
          <span key={d} className="absolute -translate-x-1/2" style={{ left: `${(d / MAX) * 100}%` }}>
            {d}
          </span>
        ))}
      </div>

      <label className="mt-5 block text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">
        Day <span className="tabular-nums text-[var(--sc-ink)]">{day}</span>
        <input type="range" min={0} max={MAX - 1} value={day} onChange={(e) => setDay(Number(e.target.value))} className="mt-2 block w-full accent-[var(--sc-accent)]" />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div className="rounded-2xl border border-[var(--sc-line)] bg-white p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">Finished replay</p>
          <p className="mt-1 font-mono text-[15px] font-semibold" style={{ color: stage.color }}>
            {stage.label}
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--sc-ink-2)]">{stage.note}</p>
        </div>
        <div className="rounded-2xl border border-[var(--sc-line)] bg-white p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">Upload that crashed on day 0</p>
          <p className={`mt-1 font-mono text-[15px] font-semibold ${abortShown ? "text-[var(--sc-ink-3)]" : "text-rose-700"}`}>{abortShown ? "Aborted" : "Parts still billed"}</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--sc-ink-2)]">
            {abortShown ? "Its parts were deleted on day 7. They never showed up in a listing, but you paid for them until then." : "Uploaded parts are invisible in ListObjectsV2 but billed as storage."}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[12.5px] text-[var(--sc-ink-3)]">S3 runs lifecycle rules asynchronously; a transition or expiry can land a little after the exact day.</p>
    </div>
  );
}
