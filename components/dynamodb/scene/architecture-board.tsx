"use client";

import { AwsIconSvg, type AwsIconId } from "./aws-icon";

export type BoardCheck = { id: string; pass: boolean; fix: string };

type Piece = { id: string; label: string; detail: string; icon: AwsIconId; x: number; y: number };

// Layout in a 820×400 board: one Region on the left, its replica on the right.
const PIECES: Piece[] = [
  { id: "billing", label: "On-demand", detail: "PAY_PER_REQUEST", icon: "dynamodb", x: 300, y: 26 },
  { id: "consistency", label: "MREC", detail: "global table mode", icon: "dynamodb", x: 300, y: 140 },
  { id: "reads", label: "Eventual reads", detail: "strong only when needed", icon: "dynamodb", x: 300, y: 254 },
  { id: "shards", label: "4+ write shards", detail: "BattleFeed#0..3", icon: "dynamodb", x: 30, y: 140 },
  { id: "streams", label: "Streams", detail: "NEW_AND_OLD_IMAGES", icon: "lambda", x: 30, y: 26 },
  { id: "pitr", label: "PITR", detail: "point-in-time recovery", icon: "backup", x: 30, y: 254 },
  { id: "kms", label: "KMS", detail: "encryption at rest", icon: "kms", x: 570, y: 26 },
  { id: "s3", label: "S3 for large items", detail: "pointer in DynamoDB", icon: "s3", x: 570, y: 140 },
  { id: "alarms", label: "CloudWatch", detail: "throttles, errors, latency", icon: "cloudwatch", x: 570, y: 254 },
];

/**
 * Quest 16: each production decision is a piece of the architecture. Pieces light up when
 * the matching check passes; missing ones stay greyed with the fix underneath.
 */
export function ArchitectureBoard({ checks }: { checks: BoardCheck[] }) {
  const byId = new Map(checks.map((c) => [c.id, c]));
  const global = byId.get("globalTable")?.pass;
  const passed = checks.filter((c) => c.pass).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-stone-700">
        {passed} of {checks.length} production decisions in place{passed === checks.length ? ". The board is fully lit." : "."}
      </p>
      <svg viewBox="0 0 820 420" className="block h-auto w-full rounded-lg border border-stone-200 bg-stone-50" role="img" aria-label={`Production architecture: ${passed} of ${checks.length} decisions in place`}>
        <rect x="280" y="14" width="260" height="354" rx="14" fill="none" stroke={global ? "#3b48cc" : "#d6d3d1"} strokeWidth="2" strokeDasharray={global ? undefined : "6 6"} />
        <text x="410" y="404" textAnchor="middle" fontSize="11" fontWeight="700" fill={global ? "#3b48cc" : "#a8a29e"}>
          {global ? "Global table: us-east-1 ⇄ eu-west-1" : "Single Region (add GLOBAL_TABLE)"}
        </text>
        {PIECES.map((p) => {
          const c = byId.get(p.id);
          const on = Boolean(c?.pass);
          return (
            <g key={p.id} transform={`translate(${p.x} ${p.y})`} opacity={on ? 1 : 0.55}>
              <rect width="220" height="100" rx="12" fill={on ? "#fff" : "#f5f5f4"} stroke={on ? "#15803d" : "#a8a29e"} strokeWidth={on ? 2 : 1.5} strokeDasharray={on ? undefined : "5 4"} />
              <g opacity={on ? 1 : 0.4}>
                <AwsIconSvg id={p.icon} x={12} y={14} size={40} label={p.label} />
              </g>
              <text x="64" y="32" fontSize="13" fontWeight="800" fill="#1c1917">
                {on ? "✓ " : "✕ "}
                {p.label}
              </text>
              <text x="64" y="50" fontSize="10.5" fill="#57534e" fontFamily="ui-monospace, monospace">
                {p.detail}
              </text>
              {!on && c && (
                <foreignObject x="12" y="58" width="200" height="40">
                  <div style={{ fontSize: 9.5, lineHeight: "12px", color: "#9a3412" }}>{c.fix}</div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
