#!/usr/bin/env node
/**
 * Imports the official AWS Architecture Icons used by the DynamoDB scenes.
 *
 * 1. Download the "Icon package" zip from https://aws.amazon.com/architecture/icons/
 * 2. node scripts/import-aws-icons.mjs ~/Downloads/Icon-package_XXXX.zip
 *
 * Copies the matching SVGs unmodified into public/aws-icons/ and writes
 * lib/dynamodb/aws-icons.json so the scenes use them (they fall back to a
 * neutral glyph for any icon that is missing). AWS permits these icons in
 * architecture diagrams and educational material; do not alter them.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, statSync, copyFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const zip = process.argv[2];
if (!zip) {
  console.error("Usage: node scripts/import-aws-icons.mjs <path to AWS Icon-package zip>");
  process.exit(1);
}

// id → filename pattern inside the package (64px service icons preferred).
const WANTED = {
  dynamodb: /^Arch_Amazon-DynamoDB_64\.svg$/,
  lambda: /^Arch_AWS-Lambda_64\.svg$/,
  s3: /^Arch_Amazon-Simple-Storage-Service_64\.svg$/,
  kms: /^Arch_AWS-Key-Management-Service_64\.svg$/,
  cloudwatch: /^Arch_Amazon-CloudWatch_64\.svg$/,
  streams: /^Res_Amazon-DynamoDB_Stream_48(_Light)?\.svg$/,
  backup: /^Arch_AWS-Backup_64\.svg$/,
  client: /^Res_Client_48(_Light)?\.svg$/,
};

const work = mkdtempSync(join(tmpdir(), "aws-icons-"));
execFileSync("unzip", ["-q", "-o", zip, "-d", work]);
// The package contains nested zips in some releases.
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
for (const inner of walk(work).filter((p) => p.endsWith(".zip"))) {
  execFileSync("unzip", ["-q", "-o", inner, "-d", inner.replace(/\.zip$/, "")]);
}
const files = walk(work).filter((p) => p.endsWith(".svg"));

const outDir = new URL("../public/aws-icons/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const manifest = {};
for (const [id, pattern] of Object.entries(WANTED)) {
  const match = files.filter((f) => pattern.test(basename(f))).sort()[0];
  if (!match) {
    console.warn(`missing: ${id} (${pattern})`);
    continue;
  }
  copyFileSync(match, join(outDir, `${id}.svg`));
  manifest[id] = `/aws-icons/${id}.svg`;
  console.log(`${id} ← ${basename(match)}`);
}
writeFileSync(new URL("../lib/dynamodb/aws-icons.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
rmSync(work, { recursive: true, force: true });
console.log(`Imported ${Object.keys(manifest).length} icons into public/aws-icons/.`);
