import { NextRequest, NextResponse } from "next/server";
import { checkS3Quest } from "@/lib/s3/checker";
import { signStamp } from "@/lib/certificates/stamps";
import { stampQuest } from "@/lib/certificates/tiers";

/** Checks Learn S3 practice code. Nothing submitted is executed and no AWS call is made. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Send JSON: { questId, code }." }, { status: 400 });
  }
  const { questId, code, learnerId } = (body ?? {}) as { questId?: unknown; code?: unknown; learnerId?: unknown };
  if (typeof questId !== "string" || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ success: false, message: "Missing questId or code." }, { status: 400 });
  }
  if (code.length > 20000) {
    return NextResponse.json({ success: false, message: "That's more code than any exercise needs (20,000 characters max)." }, { status: 413 });
  }
  const result = checkS3Quest(questId, code);
  // A passing challenge earns a signed stamp toward a certificate (lib/certificates).
  const stamp = result.success ? signStamp(stampQuest("s3", questId), "code", learnerId) : null;
  return NextResponse.json({ ...result, ...(stamp ? { stamp } : {}) });
}
