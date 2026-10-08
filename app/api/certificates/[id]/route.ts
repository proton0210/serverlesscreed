import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { certificateStore } from "@/lib/certificates/store";
import { hashKey } from "@/lib/certificates/issue";
import { CERT_ID_RE } from "@/lib/certificates/tiers";

/** Deletes a certificate. Requires the manage key returned when it was issued (header `x-manage-key`). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = certificateStore();
  if (!store) return NextResponse.json({ error: "Certificates aren't available" }, { status: 503 });
  if (!CERT_ID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const record = await store.get(id);
  const key = request.headers.get("x-manage-key") ?? "";
  const want = Buffer.from(record?.manageKeyHash ?? "0".repeat(64), "hex");
  const got = Buffer.from(hashKey(key), "hex");
  if (!record || !key || !timingSafeEqual(want, got)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await store.remove(record);
  return NextResponse.json({ deleted: true });
}
