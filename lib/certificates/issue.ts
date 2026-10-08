import { createHash, randomBytes, randomInt } from "node:crypto";

const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** e.g. SC-7K4Q-92MX: 8 characters from an alphabet without 0/O/1/I. */
export function newCertificateId() {
  const pick = () => Array.from({ length: 4 }, () => ID_ALPHABET[randomInt(ID_ALPHABET.length)]).join("");
  return `SC-${pick()}-${pick()}`;
}

export const newManageKey = () => randomBytes(24).toString("base64url");
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

// Names that would impersonate the issuer or the platform owner, plus a short abuse list.
// Extend without a deploy via CERT_NAME_BLOCKLIST (comma-separated words).
const BLOCKED = ["aws", "amazon", "admin", "administrator", "moderator", "serverlesscreed", "fuck", "shit", "cunt", "nigger", "faggot", "retard", "nazi", "hitler"];

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

export function checkName(raw: unknown): NameCheck {
  if (typeof raw !== "string") return { ok: false, error: "Enter the name to print on the certificate." };
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Names must be 2–60 characters." };
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*[\p{L}\p{M}.]$/u.test(name)) return { ok: false, error: "Use letters, spaces, hyphens, apostrophes and full stops only." };
  const extra = (process.env.CERT_NAME_BLOCKLIST ?? "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  const squashed = name.toLowerCase().replace(/[^\p{L}]/gu, "");
  const words = name.toLowerCase().split(/[\s.'’-]+/);
  if ([...BLOCKED, ...extra].some((w) => words.includes(w) || (w.length > 5 && squashed.includes(w)))) {
    return { ok: false, error: "That name can't be used on a certificate. Use your own name." };
  }
  return { ok: true, name };
}

const hits = new Map<string, number[]>();

/** Best-effort per-instance limiter: `limit` requests per minute per key. */
export function rateLimited(key: string, limit = 10) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}
