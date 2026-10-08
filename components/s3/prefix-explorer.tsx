"use client";

import { useMemo, useState } from "react";
import { FiFile, FiFolder } from "react-icons/fi";

const KEYS = [
  "cards/0252-treecko.json",
  "cards/0255-torchic.json",
  "cards/0258-mudkip.json",
  "cards/0384-rayquaza.json",
  "replays/2026/hoenn-league-final.mp4",
  "replays/2026/hoenn-league-semi-1.mp4",
  "sprites/fire/0255-torchic.png",
  "sprites/fire/0256-combusken.png",
  "sprites/grass-old/0252-treecko.png",
  "sprites/grass/0252-treecko.png",
  "sprites/grass/0253-grovyle.png",
  "sprites/grass/0254-sceptile.png",
  "sprites/water/0258-mudkip.png",
  "trainers.csv",
];

const PRESETS = [
  { label: "Everything", prefix: "", delimiter: "" },
  { label: "Top level", prefix: "", delimiter: "/" },
  { label: "Inside sprites/", prefix: "sprites/", delimiter: "/" },
  { label: "sprites/grass", prefix: "sprites/grass", delimiter: "" },
  { label: "sprites/grass/", prefix: "sprites/grass/", delimiter: "" },
];

/** Live ListObjectsV2: type a Prefix, toggle the Delimiter, and see Contents vs CommonPrefixes. */
export function PrefixExplorer() {
  const [prefix, setPrefix] = useState("sprites/");
  const [delimiter, setDelimiter] = useState("/");

  const { contents, common } = useMemo(() => {
    const contents: string[] = [];
    const common = new Set<string>();
    for (const key of KEYS) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const cut = delimiter ? rest.indexOf(delimiter) : -1;
      if (cut >= 0) common.add(prefix + rest.slice(0, cut + delimiter.length));
      else contents.push(key);
    }
    return { contents, common: Array.from(common) };
  }, [prefix, delimiter]);

  const request = `new ListObjectsV2Command({ Bucket: "hoenn-pokedex-media"${prefix ? `, Prefix: "${prefix}"` : ""}${delimiter ? `, Delimiter: "${delimiter}"` : ""} })`;

  return (
    <div aria-label="Prefix explorer" className="rounded-[22px] border border-[var(--sc-line)] bg-gradient-to-b from-white to-[#f6f3ec] p-5 shadow-[var(--sc-shadow-sm)] sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-accent)]">Try it · Prefix explorer</p>
      <p className="mt-1 text-[14px] text-[var(--sc-ink-3)]">14 objects in the bucket. There are no folders — only keys, and the listing groups them for you.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const on = p.prefix === prefix && p.delimiter === delimiter;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setPrefix(p.prefix);
                setDelimiter(p.delimiter);
              }}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${on ? "border-[var(--sc-ink)] bg-[var(--sc-ink)] text-white" : "border-[var(--sc-line)] bg-white text-[var(--sc-ink-2)] hover:border-[#d6cfbf]"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">
          Prefix
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            className="h-10 rounded-xl border border-[var(--sc-line)] bg-white px-3 font-mono text-[14px] normal-case tracking-normal text-[var(--sc-ink)] focus:border-[var(--sc-accent)] focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 self-end rounded-xl border border-[var(--sc-line)] bg-white px-3 py-2 text-[13.5px] font-medium text-[var(--sc-ink-2)]">
          <input type="checkbox" checked={delimiter === "/"} onChange={(e) => setDelimiter(e.target.checked ? "/" : "")} className="h-4 w-4 accent-[var(--sc-accent)]" />
          Delimiter <code className="sc-inline">/</code>
        </label>
      </div>

      <pre className="mt-4 overflow-x-auto rounded-xl bg-[var(--sc-code-bg)] px-4 py-3 font-mono text-[12.5px] text-[#d8dee9]">{request}</pre>

      <div className="mt-4 grid gap-4 sm:grid-cols-2" aria-live="polite">
        <div className="rounded-2xl border border-[var(--sc-line)] bg-white p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">
            CommonPrefixes <span className="tabular-nums">({common.length})</span>
          </p>
          <ul className="mt-2 grid gap-1.5">
            {common.length === 0 && <li className="text-[13px] text-[var(--sc-ink-3)]">{delimiter ? "None at this level." : "Turn on the delimiter to group keys."}</li>}
            {common.map((c) => (
              <li key={c}>
                <button type="button" onClick={() => setPrefix(c)} className="flex items-center gap-2 rounded-lg px-1 font-mono text-[13px] text-[var(--sc-ink)] hover:bg-[#f6f3ec]">
                  <FiFolder aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#b08a1e]" /> {c}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--sc-line)] bg-white p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">
            Contents <span className="tabular-nums">({contents.length})</span>
          </p>
          <ul className="mt-2 grid gap-1.5">
            {contents.length === 0 && <li className="text-[13px] text-[var(--sc-ink-3)]">No keys match directly.</li>}
            {contents.map((k) => (
              <li key={k} className="flex items-start gap-2 break-all font-mono text-[13px] text-[var(--sc-ink-2)]">
                <FiFile aria-hidden className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--sc-ink-3)]" />
                <span>
                  {k.startsWith("sprites/grass-old/") && prefix === "sprites/grass" ? (
                    <>
                      {k} <span className="ml-1 whitespace-nowrap rounded bg-rose-100 px-1 font-sans text-[10.5px] font-bold uppercase text-rose-700">surprise</span>
                    </>
                  ) : (
                    k
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-[var(--sc-ink-3)]">
        Click a common prefix to “open” it. Compare <code className="sc-inline">sprites/grass</code> with <code className="sc-inline">sprites/grass/</code>: a prefix is a plain string match.
      </p>
    </div>
  );
}
