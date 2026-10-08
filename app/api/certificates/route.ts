import { NextRequest, NextResponse } from "next/server";
import { certificateStore, type CertificateRecord } from "@/lib/certificates/store";
import { stampsEnabled, verifyStamp } from "@/lib/certificates/stamps";
import { checkName, hashKey, newCertificateId, newManageKey, rateLimited } from "@/lib/certificates/issue";
import { COURSE_EDITION, TIERS, UUID_RE, isTier, requiredStampKeys, stampKey, stampQuest, tierQuests } from "@/lib/certificates/tiers";

/**
 * Issues a certificate from a complete set of server-signed stamps.
 * Body: { tier, name, learnerId, stamps: string[], public?: boolean }
 */
export async function POST(request: NextRequest) {
  const store = certificateStore();
  if (!store || !stampsEnabled()) {
    return NextResponse.json({ error: "Certificates aren't switched on yet. Your progress is saved — try again soon." }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`issue:${ip}`)) return NextResponse.json({ error: "Too many attempts. Wait a minute and try again." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tier, learnerId, stamps } = body;
  if (!isTier(tier)) return NextResponse.json({ error: "Unknown certificate" }, { status: 400 });
  if (typeof learnerId !== "string" || !UUID_RE.test(learnerId)) return NextResponse.json({ error: "Invalid learner id" }, { status: 400 });
  const name = checkName(body.name);
  if (!name.ok) return NextResponse.json({ error: name.error, field: "name" }, { status: 400 });
  if (!Array.isArray(stamps) || stamps.length > 100) return NextResponse.json({ error: "Invalid stamps" }, { status: 400 });

  const lid = learnerId.toLowerCase();
  const passed = new Map<string, number>();
  for (const token of stamps) {
    const s = verifyStamp(token);
    if (!s || s.l !== lid) continue;
    const key = stampKey(s.q, s.k);
    passed.set(key, Math.min(passed.get(key) ?? Infinity, s.t));
  }
  const missing = requiredStampKeys(tier).filter((k) => !passed.has(k));
  if (missing.length) {
    return NextResponse.json({ error: "Some quests still need to be passed on this device.", missing }, { status: 400 });
  }

  const existing = await store.claimFor(lid, tier);
  if (existing) return NextResponse.json({ id: existing, url: `/c/${existing}`, created: false });

  const { course } = TIERS[tier];
  const quests = tierQuests(tier).map((q) => {
    const at = Math.max(...["code", "check"].map((k) => passed.get(stampKey(stampQuest(course, q.slug), k as "code" | "check")) ?? 0));
    return { slug: q.slug, passedAt: new Date(at * 1000).toISOString() };
  });
  const manageKey = newManageKey();
  const record: CertificateRecord = {
    id: newCertificateId(),
    tier,
    name: name.name,
    learnerId: lid,
    issuedAt: new Date().toISOString(),
    edition: COURSE_EDITION,
    quests,
    public: body.public !== false,
    manageKeyHash: hashKey(manageKey),
    status: "active",
  };
  try {
    const result = await store.create(record);
    return NextResponse.json(
      { id: result.id, url: `/c/${result.id}`, created: result.created, ...(result.created ? { manageKey } : {}) },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    console.error("Certificate issue failed:", error);
    return NextResponse.json({ error: "We couldn't create the certificate. Try again in a moment." }, { status: 500 });
  }
}
