import icons from "@/lib/dynamodb/aws-icons.json";

export type AwsIconId = "dynamodb" | "lambda" | "s3" | "kms" | "cloudwatch" | "streams" | "backup" | "client";

const manifest = icons as Partial<Record<AwsIconId, string>>;

/** Short, readable stand-ins used until the official icons are imported. */
const FALLBACK_TEXT: Record<AwsIconId, string> = {
  dynamodb: "DDB",
  lambda: "λ",
  s3: "S3",
  kms: "KMS",
  cloudwatch: "CW",
  streams: "STR",
  backup: "BAK",
  client: "APP",
};

export const awsIconHref = (id: AwsIconId): string | undefined => manifest[id];

/**
 * An official AWS Architecture Icon inside an SVG scene, or a neutral rounded tile with a
 * short label when the icon package hasn't been imported (scripts/import-aws-icons.mjs).
 */
export function AwsIconSvg({ id, x, y, size, label, fill = "#3b48cc" }: { id: AwsIconId; x: number; y: number; size: number; label: string; fill?: string }) {
  const href = manifest[id];
  if (href) return <image href={href} x={x} y={y} width={size} height={size} aria-label={label} />;
  return (
    <g transform={`translate(${x} ${y})`} aria-label={label}>
      <rect width={size} height={size} rx={size * 0.18} fill={fill} />
      <text x={size / 2} y={size / 2 + size * 0.12} textAnchor="middle" fontSize={size * 0.3} fontWeight="800" fill="#fff">
        {FALLBACK_TEXT[id]}
      </text>
    </g>
  );
}
