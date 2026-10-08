import type { QuestSection } from "@/lib/learn/types";
import { FiInfo } from "react-icons/fi";
import { CodeBlock } from "./code-block";

/** One editorial lesson section: prose, note, list, table, code, then any scene. */
export function LessonSection({ section, id, index }: { section: QuestSection; id: string; index: number }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28">
      <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--sc-ink-3)]">
        Section {String(index + 1).padStart(2, "0")}
      </p>
      <h2 id={`${id}-h`} className="sc-h2 text-[1.65rem] font-semibold leading-tight tracking-[-.025em] text-[var(--sc-ink)] sm:text-[1.9rem]">
        {section.title}
      </h2>
      <div className="sc-prose mt-5">
        {section.paragraphs?.map((p, i) => (
          <p key={i} className="mt-4 first:mt-0">
            {p}
          </p>
        ))}
        {section.callout && (
          <aside className="my-6 flex gap-3 rounded-2xl border border-[#e9dcb4] bg-[#fbf6e6] px-5 py-4 text-[15px] leading-relaxed text-[#5b4a17]">
            <FiInfo aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[#b08a1e]" />
            <div>{section.callout}</div>
          </aside>
        )}
        {section.bullets && (
          <ul className="sc-list">
            {section.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        {section.table && (
          <div className="my-7 overflow-hidden rounded-2xl border border-[var(--sc-line)] bg-white shadow-[var(--sc-shadow-sm)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[14.5px] leading-snug">
                <thead>
                  <tr className="bg-[#faf8f3]">
                    {section.table.headers.map((h, i) => (
                      <th key={i} scope="col" className="whitespace-nowrap border-b border-[var(--sc-line)] px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, r) => (
                    <tr key={r} className="border-b border-[#efebe1] transition-colors last:border-0 hover:bg-[#fbfaf6]">
                      {row.map((cell, c) => (
                        <td key={c} className={`px-4 py-3 align-top ${c === 0 ? "font-medium text-[var(--sc-ink)]" : "text-[var(--sc-ink-2)]"}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {section.table.caption && (
              <p className="border-t border-[#efebe1] bg-[#faf8f3] px-4 py-2.5 text-[13px] text-[var(--sc-ink-3)]">{section.table.caption}</p>
            )}
          </div>
        )}
        {section.postTableParagraphs?.map((p, i) => (
          <p key={i} className="mt-4">
            {p}
          </p>
        ))}
      </div>
      {section.codeSnippets?.map((s, i) => (
        <CodeBlock key={i} code={s.code} language={s.language} label={s.label} variants={s.variants} />
      ))}
      {section.visual && <div className="mt-8">{section.visual}</div>}
    </section>
  );
}
