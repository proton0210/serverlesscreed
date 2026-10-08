"use client";

import { useId, useMemo, useRef } from "react";
import type { TraceEvent } from "@/lib/dynamodb/trace";
import { awsIconHref } from "./aws-icon";
import { dexLabel, findPokemon, typeColor } from "@/lib/dynamodb/pokedex";
import { CritterGlyph, type CritterMood } from "./critter-svg";
import { sceneAt, type Chip, type PacketSpot, type SceneState } from "./scene-state";

const W = 820;
const H = 380;
const DB = { x: 250, y: 130, w: 170, h: 120 };
const PART_X = 500;
const PART_W = 300;
const ROW_H = 76;
const rowY = (p: number) => 20 + p * 88;

const clientY = (s: SceneState, c: SceneState["clients"][number]) => {
  if (s.clients.length < 2) return 190;
  return s.clients.indexOf(c) === 0 ? 115 : 265;
};

function spot(s: SceneState, p: PacketSpot): [number, number] {
  switch (p.at) {
    case "client":
      return [128, clientY(s, p.client)];
    case "db":
      return [DB.x + DB.w / 2, DB.y + DB.h / 2];
    case "partition":
      return [PART_X + 6, rowY(p.partition) + ROW_H / 2];
    default:
      return [DB.x + DB.w / 2, DB.y + DB.h / 2];
  }
}

const TONE: Record<SceneState["packetTone"], string> = {
  request: "#0e7490",
  read: "#2563eb",
  write: "#d97706",
  ok: "#15803d",
  error: "#dc2626",
};

const CHIP: Record<Chip["state"], { fill: string; stroke: string; text: string; strike?: boolean; opacity?: number }> = {
  stored: { fill: "#f5f5f4", stroke: "#a8a29e", text: "#292524" },
  read: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" },
  written: { fill: "#fef3c7", stroke: "#d97706", text: "#78350f" },
  lost: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  deleted: { fill: "#f5f5f4", stroke: "#a8a29e", text: "#78716c", strike: true, opacity: 0.6 },
  expired: { fill: "#e7e5e4", stroke: "#78716c", text: "#57534e", opacity: 0.7 },
  rolledBack: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d", strike: true },
};

/** "Pikachu #025 Electric · HP 35 · Atk 55 · Def 30 · Spe 90" for tooltips. */
function statLine(label: string) {
  const p = findPokemon(label);
  if (!p) return label;
  return `${p.name} ${dexLabel(p)} ${p.type1}${p.type2 ? "/" + p.type2 : ""} · HP ${p.hp} · Atk ${p.attack} · Def ${p.defense} · Spe ${p.speed}`;
}

const CHIP_MOOD: Record<Chip["state"], CritterMood> = {
  stored: "idle",
  read: "curious",
  written: "happy",
  lost: "worried",
  deleted: "worried",
  expired: "worried",
  rolledBack: "worried",
};

export type TraceScene2DProps = {
  events: TraceEvent[];
  index: number;
  stepMs: number;
  /** Compact mode draws items as small coloured tiles (used by the 24-item partition lab). */
  compact?: { color: (name: string) => string; hot?: number[] };
  className?: string;
};

/** Flat SVG renderer for any trace. Used everywhere, and as the fallback for 3D scenes. */
export function TraceScene2D({ events, index, stepMs, compact, className }: TraceScene2DProps) {
  const s = useMemo(() => sceneAt(events, index), [events, index]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [px, py] = spot(s, s.packet);
  // Remember where the packet came from so each hop leaves a short-lived trail.
  const prev = useRef<{ index: number; from: [number, number]; to: [number, number] }>({ index: 0, from: [px, py], to: [px, py] });
  if (prev.current.index !== index) prev.current = { index, from: prev.current.to, to: [px, py] };
  const trail = prev.current;
  const moved = Math.hypot(trail.to[0] - trail.from[0], trail.to[1] - trail.from[1]) > 4 && s.packet.at !== "hidden";
  const transition = `transform ${Math.max(stepMs * 0.8, 0)}ms cubic-bezier(.5,0,.3,1), opacity 200ms`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Diagram of the request moving from your app through DynamoDB to its partitions">
      <style>{`
        @keyframes sc-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.06); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes sc-trail { from { stroke-dashoffset: 0; opacity: .9 } to { stroke-dashoffset: -60; opacity: 0 } }
        @keyframes sc-glow { 0%, 100% { opacity: .35 } 50% { opacity: .8 } }
        .sc-pop { transform-box: fill-box; transform-origin: center; animation: sc-pop 420ms cubic-bezier(.2,.9,.3,1.2) both }
        .sc-trail { stroke-dasharray: 6 6; animation: sc-trail 900ms ease-out forwards }
        .sc-glow { animation: sc-glow 1.4s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .sc-pop, .sc-trail, .sc-glow { animation: none } .sc-trail { opacity: 0 } }
      `}</style>
      <defs>
        <filter id={`sc-shadow-${uid}`} x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#1c1917" floodOpacity="0.12" />
        </filter>
        <linearGradient id={`sc-ddb-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f5ce0" />
          <stop offset="1" stopColor="#2f3aa8" />
        </linearGradient>
        <marker id={`sc-arrow-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#a8a29e" />
        </marker>
      </defs>

      {/* Clients */}
      {s.clients.map((c) => {
        const y = clientY(s, c);
        const active = s.activeClient === c && index > 0;
        return (
          <g key={c} transform={`translate(20 ${y - 36})`}>
            <rect width="108" height="72" rx="10" fill="#fff" stroke={active ? "#0e7490" : "#d6d3d1"} strokeWidth={active ? 2.5 : 1.5} filter={`url(#sc-shadow-${uid})`} />
            <text x="54" y="31" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1c1917">
              {c === "app" ? "Your app" : c === "A" ? "Ash" : "Gary"}
            </text>
            <text x="54" y="51" textAnchor="middle" fontSize="11" fill="#78716c" fontFamily="ui-monospace, monospace">
              AWS SDK v3
            </text>
          </g>
        );
      })}
      {s.clients.map((c) => (
        <line key={`l-${c}`} x1="130" y1={clientY(s, c)} x2={DB.x - 4} y2={DB.y + DB.h / 2} stroke="#d6d3d1" strokeWidth="1.5" markerEnd={`url(#sc-arrow-${uid})`} />
      ))}

      {/* DynamoDB */}
      <g transform={`translate(${DB.x} ${DB.y})`}>
        <rect width={DB.w} height={DB.h} rx="12" fill={`url(#sc-ddb-${uid})`} filter={`url(#sc-shadow-${uid})`} />
        {awsIconHref("dynamodb") ? (
          <image href={awsIconHref("dynamodb")} x="12" y="14" width="38" height="38" aria-label="Amazon DynamoDB" />
        ) : (
          <g transform="translate(18 22)" fill="none" stroke="#fff" strokeWidth="2">
            <ellipse cx="14" cy="4" rx="14" ry="5" />
            <path d="M0 4 v22 c0 3 6 5 14 5 s14 -2 14 -5 v-22" />
            <path d="M0 15 c0 3 6 5 14 5 s14 -2 14 -5" />
          </g>
        )}
        <text x="56" y="32" fontSize="13" fontWeight="700" fill="#fff">DynamoDB</text>
        <text x="56" y="49" fontSize="11" fill="#c7d2fe" fontFamily="ui-monospace, monospace">
          {s.index ? s.index : s.table ?? "table"}
        </text>
        <text x={DB.w / 2} y="80" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
          {s.op ?? ""}
        </text>
        <text x={DB.w / 2} y="100" textAnchor="middle" fontSize="10.5" fill="#e0e7ff" fontFamily="ui-monospace, monospace">
          {s.hash ?? ""}
        </text>
      </g>

      {/* Condition gate */}
      {s.gate && (
        <g transform={`translate(${DB.x} ${DB.y + DB.h + 12})`}>
          <rect width={DB.w} height="30" rx="8" fill={s.gate.pass ? "#dcfce7" : "#fee2e2"} stroke={s.gate.pass ? "#15803d" : "#dc2626"} />
          <text x={DB.w / 2} y="19" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={s.gate.pass ? "#14532d" : "#7f1d1d"}>
            {s.gate.pass ? "✓ condition passed" : "✕ condition failed"}
          </text>
        </g>
      )}
      {s.retry && (
        <g transform={`translate(${DB.x} ${DB.y - 44})`}>
          <rect width={DB.w} height="30" rx="8" fill="#fef3c7" stroke="#d97706" />
          <text x={DB.w / 2} y="19" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#78350f">
            ⟳ retry in {s.retry.delayMs} ms
          </text>
        </g>
      )}
      {s.bookmark && !s.retry && (
        <g transform={`translate(${DB.x - 20} ${DB.y - 44})`}>
          <rect width={DB.w + 40} height="30" rx="8" fill="#ecfeff" stroke="#0e7490" />
          <text x={(DB.w + 40) / 2} y="19" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#164e63" fontFamily="ui-monospace, monospace">
            {s.bookmark}
          </text>
        </g>
      )}

      {/* Partitions */}
      {s.partitions.map((chips, p) => {
        const active = s.activePartitions.includes(p);
        const hot = compact?.hot?.includes(p);
        const y = rowY(p);
        return (
          <g key={p} transform={`translate(${PART_X} ${y})`}>
            <line x1={DB.x + DB.w - PART_X + 4} y1={DB.y + DB.h / 2 - y} x2="-4" y2={ROW_H / 2} stroke={active ? "#0e7490" : "#e7e5e4"} strokeWidth={active ? 2 : 1} />
            {(active || hot) && <rect x="-3" y="-3" width={PART_W + 6} height={ROW_H + 6} rx="13" fill="none" stroke={hot ? "#f87171" : "#67e8f9"} strokeWidth="4" className="sc-glow" />}
            <rect width={PART_W} height={ROW_H} rx="10" fill={hot ? "#fef2f2" : "#fff"} stroke={hot ? "#dc2626" : active ? "#0e7490" : "#d6d3d1"} strokeWidth={active || hot ? 2.5 : 1.5} filter={`url(#sc-shadow-${uid})`} />
            <text x="12" y="20" fontSize="12" fontWeight="800" fill={hot ? "#b91c1c" : "#44403c"} fontFamily="ui-monospace, monospace">
              P{p}
              {hot ? " · HOT" : ""}
            </text>
            {compact ? (
              <g transform="translate(12 30)">
                {chips.slice(0, 24).map((c, i) => (
                  <rect key={c.name} className="sc-pop" x={(i % 12) * 23} y={Math.floor(i / 12) * 20} width="19" height="16" rx="3" fill={compact.color(c.name)} stroke="#1c1917" strokeWidth="0.75">
                    <title>{statLine(c.name)}</title>
                  </rect>
                ))}
              </g>
            ) : (
              <g transform="translate(46 8)">
                {chips.slice(0, 6).map((c, i) => {
                  const st = CHIP[c.state];
                  const cx = (i % 3) * 84;
                  const cy = Math.floor(i / 3) * 32;
                  return (
                    <g key={c.name} transform={`translate(${cx} ${cy})`} opacity={st.opacity ?? 1}>
                      <g key={c.state} className="sc-pop">
                      <rect width="80" height="27" rx="6" fill={st.fill} stroke={st.stroke} strokeWidth="1.5" />
                      {findPokemon(c.name) && <rect x="1.5" y="1.5" width="3" height="24" rx="1.5" fill={typeColor(c.name)} />}
                      {findPokemon(c.name) && <CritterGlyph type={findPokemon(c.name)!.type1} mood={CHIP_MOOD[c.state]} x={5} y={2.5} size={22} />}
                      <text x={findPokemon(c.name) ? 53 : 40} y={c.note ? 12 : 17} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={st.text} textDecoration={st.strike ? "line-through" : undefined}>
                        {c.name.length > 9 ? c.name.slice(0, 8) + "…" : c.name}
                      </text>
                      {c.note && (
                        <text x={findPokemon(c.name) ? 53 : 40} y="23" textAnchor="middle" fontSize="8" fill={st.text}>
                          {c.note.length > 12 ? c.note.slice(0, 11) + "…" : c.note}
                        </text>
                      )}
                      <title>{`${statLine(c.name)}${c.note ? ` — ${c.note}` : ""}`}</title>
                      </g>
                    </g>
                  );
                })}
                {chips.length > 6 && (
                  <text x="250" y="60" fontSize="11" fill="#78716c">
                    +{chips.length - 6}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* Capacity */}
      <g transform="translate(20 330)">
        <text fontSize="11" fontWeight="800" fill="#57534e" letterSpacing="1">
          CONSUMED
        </text>
        <text y="22" fontSize="15" fontWeight="700" fill="#1c1917" fontFamily="ui-monospace, monospace" style={{ fontVariantNumeric: "tabular-nums" }}>
          {s.rcu ? `${s.rcu} RCU` : ""}
          {s.rcu && s.wcu ? " · " : ""}
          {s.wcu ? `${s.wcu} WCU` : ""}
          {!s.rcu && !s.wcu ? "0" : ""}
        </text>
      </g>

      {/* Response */}
      {s.response && (
        <g transform="translate(160 306)">
          <rect width="325" height="66" rx="8" fill={s.response.warn ? "#fffbeb" : s.response.ok ? "#f0fdf4" : "#fef2f2"} stroke={s.response.warn ? "#d97706" : s.response.ok ? "#15803d" : "#dc2626"} className="sc-pop" />
          <foreignObject x="8" y="5" width="309" height="58">
            <div style={{ fontSize: 10.5, lineHeight: "14px", fontWeight: 600, color: s.response.warn ? "#78350f" : s.response.ok ? "#14532d" : "#7f1d1d", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
              {s.response.warn ? "⚠ 200 OK, but data was lost: " : s.response.ok ? "✓ " : "✕ "}
              {s.response.text}
            </div>
          </foreignObject>
        </g>
      )}

      {/* Trail of the last hop */}
      {moved && stepMs > 0 && (
        <line key={`trail-${index}`} x1={trail.from[0]} y1={trail.from[1]} x2={trail.to[0]} y2={trail.to[1]} stroke={TONE[s.packetTone]} strokeWidth="3" strokeLinecap="round" className="sc-trail" />
      )}

      {/* Packet */}
      <circle
        r="9"
        cx="0"
        cy="0"
        fill={TONE[s.packetTone]}
        stroke="#fff"
        strokeWidth="2.5"
        filter={`url(#sc-shadow-${uid})`}
        style={{ transform: `translate(${px}px, ${py}px)`, transition, opacity: s.packet.at === "hidden" ? 0 : 1 }}
      />
    </svg>
  );
}
