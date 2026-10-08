import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { certificateStore } from "@/lib/certificates/store";
import { CERT_ID_RE, TIERS, tierBadges } from "@/lib/certificates/tiers";

export const runtime = "nodejs";
export const alt = "Serverless Creed certificate of completion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Inlines a badge from public/ (PNG for DynamoDB, SVG for S3). */
const badge = async (src: string) =>
  `data:${src.endsWith(".svg") ? "image/svg+xml" : "image/png"};base64,${(await readFile(path.join(process.cwd(), "public", src))).toString("base64")}`;

/** The social preview LinkedIn and X show for a shared certificate link. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = certificateStore();
  const cert = CERT_ID_RE.test(id) && store ? await store.get(id).catch(() => null) : null;
  const t = cert ? TIERS[cert.tier] : null;
  const badges = await Promise.all(tierBadges(cert?.tier ?? "practitioner").map(badge));
  const issued = cert ? new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#111214", padding: 36 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#fbf8f1",
            border: "3px solid #1c1a15",
            outline: "1px solid #b8a77a",
            outlineOffset: -14,
            padding: "40px 64px 30px",
            color: "#1c1a15",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "#16140f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900 }}>SC</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase" }}>Serverless Creed</div>
          </div>
          <div style={{ marginTop: 22, fontSize: 17, fontWeight: 600, letterSpacing: 7, color: "#0e7c6b", textTransform: "uppercase" }}>Certificate of completion</div>
          <div style={{ marginTop: 26, fontSize: cert && cert.name.length > 26 ? 50 : 64, fontFamily: "serif", borderBottom: "2px solid #b8a77a", padding: "0 30px 8px", maxWidth: 1000, display: "flex" }}>
            {cert?.name ?? "Certificate not found"}
          </div>
          <div style={{ marginTop: 22, fontSize: 22, color: "#5b564a", display: "flex" }}>{cert ? `completed all ${cert.quests.length} hands-on quests of` : "This certificate may have been removed."}</div>
          {t && <div style={{ marginTop: 8, fontSize: 38, fontWeight: 700, display: "flex" }}>{t.title}</div>}
          {t && <div style={{ marginTop: 4, fontSize: 22, color: "#5b564a", display: "flex" }}>{t.forService}</div>}
          <div style={{ marginTop: "auto", width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 18 }}>
              <span style={{ fontWeight: 700 }}>{issued}</span>
              <span style={{ fontSize: 13, color: "#6f6a5f", letterSpacing: 3, textTransform: "uppercase" }}>Issued</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {badges.map((src) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img key={src.slice(-24)} src={src} width={96} height={96} />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 18 }}>
              <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{cert?.id ?? id}</span>
              <span style={{ fontSize: 13, color: "#6f6a5f", letterSpacing: 3, textTransform: "uppercase" }}>Verified certificate</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
