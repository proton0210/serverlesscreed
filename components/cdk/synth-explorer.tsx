"use client";

import { useState } from "react";
import { logicalIdFor } from "@/lib/cdk/md5";

type Opts = { versioned: boolean; enforceSSL: boolean; destroy: boolean; autoDelete: boolean };

const TOGGLES: { key: keyof Opts; label: string }[] = [
  { key: "versioned", label: "versioned: true" },
  { key: "enforceSSL", label: "enforceSSL: true" },
  { key: "destroy", label: "removalPolicy: DESTROY" },
  { key: "autoDelete", label: "autoDeleteObjects: true" },
];

/** Flip bucket props and watch the resources `cdk synth` would emit. Mirrors lib/cdk/synth.ts for this one construct. */
export function SynthExplorer() {
  const [o, setO] = useState<Opts>({ versioned: true, enforceSSL: false, destroy: false, autoDelete: false });
  const invalid = o.autoDelete && !o.destroy;

  const props = [o.versioned && "  versioned: true,", o.enforceSSL && "  enforceSSL: true,", o.destroy && "  removalPolicy: cdk.RemovalPolicy.DESTROY,", o.autoDelete && "  autoDeleteObjects: true,"].filter(Boolean) as string[];
  const code = `new s3.Bucket(this, "CardsBucket"${props.length ? `, {\n${props.join("\n")}\n}` : ""});`;

  const resources: { id: string; type: string; note?: string }[] = [{ id: logicalIdFor(["CardsBucket", "Resource"]), type: "AWS::S3::Bucket", note: o.destroy ? "DeletionPolicy: Delete" : "DeletionPolicy: Retain (the default)" }];
  if (o.enforceSSL || o.autoDelete) resources.push({ id: logicalIdFor(["CardsBucket", "Policy", "Resource"]), type: "AWS::S3::BucketPolicy", note: [o.enforceSSL && "denies requests without TLS", o.autoDelete && "lets the clean-up role empty the bucket"].filter(Boolean).join("; ") });
  if (o.autoDelete) {
    resources.push({ id: logicalIdFor(["CardsBucket", "AutoDeleteObjectsCustomResource", "Default"]), type: "Custom::S3AutoDeleteObjects", note: "runs when the stack is deleted" });
    resources.push({ id: logicalIdFor(["Custom::S3AutoDeleteObjectsCustomResourceProvider", "Role"]), type: "AWS::IAM::Role" });
    resources.push({ id: logicalIdFor(["Custom::S3AutoDeleteObjectsCustomResourceProvider", "Handler"]), type: "AWS::Lambda::Function" });
  }

  return (
    <div role="region" aria-label="Synth explorer" className="rounded-[22px] border border-[var(--sc-line)] bg-gradient-to-b from-white to-[#f6f3ec] p-5 shadow-[var(--sc-shadow-sm)] sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-accent)]">Try it · What synth produces</p>
      <p className="mt-1 text-[14px] text-[var(--sc-ink-3)]">Toggle bucket props and see the resources CloudFormation would receive.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {TOGGLES.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={o[t.key]}
            onClick={() => setO((p) => ({ ...p, [t.key]: !p[t.key] }))}
            className={`rounded-full border px-3 py-1.5 font-mono text-[12.5px] font-semibold transition ${o[t.key] ? "border-[var(--sc-ink)] bg-[var(--sc-ink)] text-white" : "border-[var(--sc-line)] bg-white text-[var(--sc-ink-2)] hover:border-[#d6cfbf]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-[var(--sc-code-bg)] px-4 py-3 font-mono text-[12.5px] text-[#d8dee9]">{code}</pre>
      <div className="mt-4 rounded-2xl border border-[var(--sc-line)] bg-white p-4" aria-live="polite">
        {invalid ? (
          <p className="text-[14px] leading-relaxed text-rose-700">
            <strong>Error:</strong> Cannot use &apos;autoDeleteObjects&apos; property on a bucket without setting removal policy to &apos;DESTROY&apos;. CDK stops before writing a template.
          </p>
        ) : (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">
              Resources <span className="tabular-nums">({resources.length})</span>
            </p>
            <ul className="mt-2 grid gap-2">
              {resources.map((r) => (
                <li key={r.id} className="text-[13px]">
                  <span className="font-mono font-semibold text-[var(--sc-ink)]">{r.type}</span>
                  <span className="block break-all font-mono text-[12px] text-[var(--sc-ink-3)]">{r.id}</span>
                  {r.note && <span className="text-[var(--sc-ink-2)]">{r.note}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
