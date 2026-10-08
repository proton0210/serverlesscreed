import { TIERS, tierBadges, type TierId } from "@/lib/certificates/tiers";
import { SITE_URL } from "@/lib/certificates/share";

const HOST = SITE_URL.replace(/^https?:\/\//, "");

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
const SCRIPT = '"Snell Roundhand", "Segoe Script", "Apple Chancery", "URW Chancery L", cursive';

export const formatIssued = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The certificate itself. One layout for the public page, the print/PDF view and the claim preview.
 * No AWS or Pokémon marks: the service is named in plain text ("for Amazon DynamoDB", "for Amazon S3").
 */
export function CertificateCard({
  name,
  tier,
  quests,
  issuedAt,
  id,
  preview = false,
}: {
  name: string;
  tier: TierId;
  quests: number;
  issuedAt?: string;
  id?: string;
  preview?: boolean;
}) {
  const t = TIERS[tier];
  const badges = tierBadges(tier);
  return (
    <div
      className="sc-certificate relative isolate aspect-[1.414/1] w-full overflow-hidden rounded-[6px] bg-[#fbf8f1] text-[#1c1a15] shadow-[0_1px_2px_rgba(0,0,0,.06),0_30px_60px_-24px_rgba(22,20,15,.35)] ring-1 ring-black/[0.06] [container-type:inline-size]"
      role="img"
      aria-label={`Certificate: ${name || "Your name"} completed ${t.title} ${t.forService}${issuedAt ? `, issued ${formatIssued(issuedAt)}` : ""}${id ? `, certificate ${id}` : ""}.`}
    >
      {/* guilloché field + frame */}
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1414 1000" preserveAspectRatio="none">
        <defs>
          <pattern id="sc-guilloche" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M0 18 Q9 0 18 18 T36 18" fill="none" stroke="#0e7c6b" strokeOpacity=".07" strokeWidth="1" />
            <path d="M0 18 Q9 36 18 18 T36 18" fill="none" stroke="#4f5bd5" strokeOpacity=".05" strokeWidth="1" />
          </pattern>
          <radialGradient id="sc-fade" cx="50%" cy="50%" r="60%">
            <stop offset="55%" stopColor="#fbf8f1" stopOpacity="1" />
            <stop offset="100%" stopColor="#fbf8f1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1414" height="1000" fill="url(#sc-guilloche)" />
        <rect width="1414" height="1000" fill="url(#sc-fade)" />
        <rect x="34" y="34" width="1346" height="932" fill="none" stroke="#1c1a15" strokeWidth="2.5" />
        <rect x="46" y="46" width="1322" height="908" fill="none" stroke="#b8a77a" strokeWidth="1" />
        {[
          [46, 46],
          [1368, 46],
          [46, 954],
          [1368, 954],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <circle r="9" fill="#fbf8f1" stroke="#b8a77a" />
            <circle r="3.5" fill="#0e7c6b" />
          </g>
        ))}
      </svg>

      <div className="flex h-full flex-col items-center px-[7%] pb-[5.5%] pt-[6%] text-center">
        <div className="flex items-center gap-[1.2cqw]">
          <span className="grid h-[4.2cqw] w-[4.2cqw] place-items-center rounded-[1cqw] bg-[#16140f] text-[1.5cqw] font-black tracking-tight text-white">SC</span>
          <span className="text-[1.45cqw] font-bold uppercase tracking-[.32em]">Serverless Creed</span>
        </div>
        <p className="mt-[3.2cqw] text-[1.25cqw] font-semibold uppercase tracking-[.42em] text-[#0e7c6b]">Certificate of completion</p>
        <p className="mt-[2.4cqw] text-[1.55cqw] italic text-[#5b564a]" style={{ fontFamily: SERIF }}>
          This certifies that
        </p>
        <p
          className={`mt-[1cqw] max-w-full truncate border-b border-[#b8a77a] px-[3cqw] pb-[.8cqw] text-[5.2cqw] leading-[1.15] ${name ? "" : "text-[#767061]"}`}
          style={{ fontFamily: SERIF }}
        >
          {name || "Your name"}
        </p>
        <p className="mt-[2cqw] text-[1.55cqw] italic text-[#5b564a]" style={{ fontFamily: SERIF }}>
          has completed all {quests} hands-on quests of
        </p>
        <p className="mt-[.8cqw] text-[3cqw] font-semibold leading-tight tracking-[-.01em]">{t.title}</p>
        <p className="mt-[.5cqw] text-[1.55cqw] text-[#5b564a]">{t.forService}</p>
        <p className="mx-auto mt-[2.2cqw] max-w-[62%] text-[1.35cqw] italic leading-snug text-[#6f6a5f]" style={{ fontFamily: SERIF }}>
          {t.blurb}
        </p>

        <div className="mt-auto grid w-full grid-cols-3 items-end gap-[2cqw]">
          <div className="text-left">
            <p className="text-[1.5cqw] font-semibold">{issuedAt ? formatIssued(issuedAt) : preview ? "Issue date" : ""}</p>
            <p className="mt-[.4cqw] border-t border-[#cfc6ad] pt-[.5cqw] text-[1.05cqw] uppercase tracking-[.18em] text-[#6f6a5f]">Issued</p>
          </div>
          <div className="flex justify-center gap-[.6cqw]">
            {badges.map((b) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b} src={b} alt="" className="h-[8.5cqw] w-[8.5cqw] drop-shadow-[0_.6cqw_.8cqw_rgba(0,0,0,.18)]" />
            ))}
          </div>
          <div className="text-right">
            <p className="text-[2.4cqw] leading-none text-[#1c1a15]" style={{ fontFamily: SCRIPT }}>
              Vidit Shah
            </p>
            <p className="mt-[.4cqw] border-t border-[#cfc6ad] pt-[.5cqw] text-[1.05cqw] uppercase tracking-[.18em] text-[#6f6a5f]">Founder, Serverless Creed</p>
          </div>
        </div>
        <p className="mt-[2cqw] text-[.95cqw] text-[#6f6a5f]">
          {id ? (
            <>
              Certificate {id} · verify at {HOST}/c/{id}
            </>
          ) : (
            "Certificate ID and verification link appear here"
          )}
        </p>
        <p className="mt-[.4cqw] text-[.85cqw] text-[#6f6a5f]">
          Serverless Creed is not affiliated with or endorsed by Amazon Web Services. This is not an AWS Certification.
        </p>
      </div>
    </div>
  );
}
