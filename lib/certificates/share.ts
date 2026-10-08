import { TIERS, type TierId } from "./tiers";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://serverlesscreed.com").replace(/\/$/, "");

export const certificateUrl = (id: string) => `${SITE_URL}/c/${id}`;

/**
 * LinkedIn "Add to profile" (Licenses & certifications), per https://addtoprofile.linkedin.com/.
 * organizationId and organizationName can't be combined: set NEXT_PUBLIC_LINKEDIN_ORG_ID once the
 * Serverless Creed company page exists so the logo shows on learners' profiles.
 */
export function linkedInAddUrl(cert: { id: string; tier: TierId; issuedAt: string }) {
  const d = new Date(cert.issuedAt);
  const params = new URLSearchParams({ startTask: "CERTIFICATION_NAME", name: `${TIERS[cert.tier].title} — ${TIERS[cert.tier].forService}` });
  const orgId = process.env.NEXT_PUBLIC_LINKEDIN_ORG_ID;
  if (orgId) params.set("organizationId", orgId);
  else params.set("organizationName", "Serverless Creed");
  params.set("issueYear", String(d.getUTCFullYear()));
  params.set("issueMonth", String(d.getUTCMonth() + 1));
  params.set("certUrl", `${certificateUrl(cert.id)}?utm_source=linkedin&utm_medium=profile&utm_campaign=certificate`);
  params.set("certId", cert.id);
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export const linkedInShareUrl = (id: string) =>
  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${certificateUrl(id)}?utm_source=linkedin&utm_medium=social&utm_campaign=certificate`)}`;

export function shareText(tier: TierId, quests: number) {
  const t = TIERS[tier];
  return `I just earned the ${t.title} certificate (${t.forService}) from Serverless Creed — ${quests} hands-on quests on ${t.shareTopics}. ${t.hashtags}`;
}

export const xShareUrl = (id: string, tier: TierId, quests: number) =>
  `https://x.com/intent/post?text=${encodeURIComponent(`${shareText(tier, quests)}\n\n${certificateUrl(id)}?utm_source=x&utm_campaign=certificate`)}`;
