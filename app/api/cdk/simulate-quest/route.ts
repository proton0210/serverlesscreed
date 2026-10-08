import { NextRequest, NextResponse } from "next/server";
import { checkCdkQuest } from "@/lib/cdk/checker";
import { findCredentials } from "@/lib/cdk/scan";
import { signStamp } from "@/lib/certificates/stamps";
import { stampQuest } from "@/lib/certificates/tiers";

/** Checks Learn CDK practice code. Nothing submitted is executed: it is parsed, simulated and synthesized in memory. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 100_000) return NextResponse.json({ success: false, message: "That request is far larger than any exercise needs." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, message: "Send JSON: { questId, code, language }." }, { status: 400 });
  }
  const { questId, code, language, learnerId } = (body ?? {}) as { questId?: unknown; code?: unknown; language?: unknown; learnerId?: unknown };
  if (typeof questId !== "string" || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ success: false, message: "Missing questId or code." }, { status: 400 });
  }
  if (language !== "typescript" && language !== "python") {
    return NextResponse.json({ success: false, message: 'language must be "typescript" or "python".' }, { status: 400 });
  }
  if (code.length > 20000) {
    return NextResponse.json({ success: false, message: "That's more code than any exercise needs (20,000 characters max)." }, { status: 413 });
  }
  // The browser scans before sending, but the API can be called directly: never process, or echo back, credentials.
  if (findCredentials(code)) {
    return NextResponse.json({ success: false, error: "Blocked by the security scan", message: "Credential-like material is never accepted. Remove it and run again." }, { status: 422 });
  }
  const result = checkCdkQuest(questId, code, language);
  const stamp = result.success ? signStamp(stampQuest("cdk", questId), "code", learnerId) : null;
  return NextResponse.json({ ...result, ...(stamp ? { stamp } : {}) });
}
