import { createHmac, timingSafeEqual } from "node:crypto";
import { UUID_RE, type StampKind, type StampPayload } from "./tiers";

const DEV_SECRET = "serverlesscreed-dev-only-stamp-secret";

/** Secrets that verify stamps: current first, then the previous one during rotation. */
function secrets(): string[] {
  const current = process.env.CERT_STAMP_SECRET;
  const previous = process.env.CERT_STAMP_SECRET_PREVIOUS;
  if (current) return [current, ...(previous ? [previous] : [])];
  return process.env.NODE_ENV === "production" ? [] : [DEV_SECRET];
}

export const stampsEnabled = () => secrets().length > 0;

const b64 = (buf: Buffer) => buf.toString("base64url");
const mac = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest();

/** Signs proof that `learnerId` passed `quest` (code challenge or check). Null when stamps are off or the id is invalid. */
export function signStamp(quest: string, kind: StampKind, learnerId: unknown): string | null {
  const [secret] = secrets();
  if (!secret || typeof learnerId !== "string" || !UUID_RE.test(learnerId)) return null;
  const payload: StampPayload = { v: 1, q: quest, k: kind, l: learnerId.toLowerCase(), t: Math.floor(Date.now() / 1000) };
  const body = b64(Buffer.from(JSON.stringify(payload)));
  return `${body}.${b64(mac(secret, body))}`;
}

export function verifyStamp(token: unknown): StampPayload | null {
  if (typeof token !== "string" || token.length > 400) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const given = Buffer.from(sig, "base64url");
  const ok = secrets().some((s) => {
    const want = mac(s, body);
    return want.length === given.length && timingSafeEqual(want, given);
  });
  if (!ok) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as StampPayload;
    return p.v === 1 && typeof p.q === "string" && (p.k === "code" || p.k === "check") && typeof p.l === "string" && typeof p.t === "number" ? p : null;
  } catch {
    return null;
  }
}
