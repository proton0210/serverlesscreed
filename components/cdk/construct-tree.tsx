"use client";

import { useState } from "react";
import { FiBox, FiFolder, FiLayers, FiPackage } from "react-icons/fi";
import { logicalIdFor } from "@/lib/cdk/md5";

type Node = { id: string; label: string; kind: "app" | "stack" | "construct" | "resource"; path: string[]; note: string; children?: Node[] };

const tree: Node = {
  id: "app",
  label: "App",
  kind: "app",
  path: [],
  note: "The root of the tree. `cdk synth` writes everything beneath it to cdk.out.",
  children: [
    {
      id: "stack",
      label: "PokedexStack",
      kind: "stack",
      path: [],
      note: "One CloudFormation stack. Its id is the stack name, and it is the unit AWS deploys and deletes.",
      children: [
        {
          id: "cards",
          label: "CardsBucket",
          kind: "construct",
          path: ["CardsBucket"],
          note: "An L2 construct: s3.Bucket. It owns the resource underneath, and can add more (a policy, grants).",
          children: [{ id: "cards-res", label: "Resource", kind: "resource", path: ["CardsBucket", "Resource"], note: "The L1 CfnBucket: this is the AWS::S3::Bucket in the template." }],
        },
        {
          id: "table",
          label: "PokedexTable",
          kind: "construct",
          path: ["PokedexTable"],
          note: "An L2 construct: dynamodb.Table.",
          children: [{ id: "table-res", label: "Resource", kind: "resource", path: ["PokedexTable", "Resource"], note: "The L1 CfnTable: the AWS::DynamoDB::Table." }],
        },
        {
          id: "fn",
          label: "LookupFn",
          kind: "construct",
          path: ["LookupFn"],
          note: "An L2 construct: lambda.Function. It also creates its execution role as a child.",
          children: [
            { id: "fn-role", label: "ServiceRole", kind: "resource", path: ["LookupFn", "ServiceRole", "Resource"], note: "The IAM role CDK creates for the function. Grants add policies to it." },
            { id: "fn-res", label: "Resource", kind: "resource", path: ["LookupFn", "Resource"], note: "The AWS::Lambda::Function." },
          ],
        },
      ],
    },
  ],
};

const icon = { app: FiPackage, stack: FiLayers, construct: FiBox, resource: FiFolder };

function Row({ node, depth, active, onPick }: { node: Node; depth: number; active: string; onPick: (n: Node) => void }) {
  const Icon = icon[node.kind];
  return (
    <>
      <li style={{ paddingLeft: depth * 18 }}>
        <button
          type="button"
          aria-pressed={active === node.id}
          onClick={() => onPick(node)}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[13px] transition ${active === node.id ? "bg-[var(--sc-ink)] text-white" : "text-[var(--sc-ink)] hover:bg-[#f1eee6]"}`}
        >
          <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {node.label}
        </button>
      </li>
      {node.children?.map((c) => <Row key={c.id} node={c} depth={depth + 1} active={active} onPick={onPick} />)}
    </>
  );
}

/** The construct tree of the Pokédex app. Pick a node to see its path and the logical ID CloudFormation gets. */
export function ConstructTree() {
  const [node, setNode] = useState<Node>(tree.children![0].children![0]);
  const isResource = node.kind === "resource" && node.path.length > 0;
  return (
    <div role="region" aria-label="Construct tree" className="rounded-[22px] border border-[var(--sc-line)] bg-gradient-to-b from-white to-[#f6f3ec] p-5 shadow-[var(--sc-shadow-sm)] sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--sc-accent)]">Try it · The construct tree</p>
      <p className="mt-1 text-[14px] text-[var(--sc-ink-3)]">Pick a node. The path from the stack down is what CDK hashes into the logical ID.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ul className="grid gap-0.5 rounded-2xl border border-[var(--sc-line)] bg-white p-3">
          <Row node={tree} depth={0} active={node.id} onPick={setNode} />
        </ul>
        <div className="rounded-2xl border border-[var(--sc-line)] bg-white p-4" aria-live="polite">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">{node.kind}</p>
          <p className="mt-1 font-mono text-[15px] font-semibold text-[var(--sc-ink)]">{node.label}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--sc-ink-2)]">{node.note}</p>
          {node.path.length > 0 && (
            <dl className="mt-3 grid gap-2 text-[13px]">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">Path</dt>
                <dd className="break-all font-mono text-[var(--sc-ink)]">PokedexStack/{node.path.join("/")}</dd>
              </div>
              {isResource && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sc-ink-3)]">Logical ID in the template</dt>
                  <dd className="break-all font-mono text-[var(--sc-ink)]">{logicalIdFor(node.path)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-[var(--sc-ink-3)]">Rename <code className="sc-inline">CardsBucket</code> in your code and its path, hash and logical ID all change: CloudFormation then creates a new bucket and deletes the old one.</p>
    </div>
  );
}
