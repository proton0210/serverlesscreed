import { parse } from "acorn";
import { NextRequest, NextResponse } from "next/server";
import { signStamp } from "@/lib/certificates/stamps";
import { emulatedPokemon } from "@/lib/dynamodb/dynamodb-emulator";
import { scanTrace } from "@/lib/dynamodb/emulator-traces";

export async function POST(request: NextRequest) {
  try {
    const { code, learnerId } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    try {
      parse(code, { ecmaVersion: "latest", sourceType: "module" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JavaScript";
      return NextResponse.json({ error: `Syntax error: ${message}` }, { status: 400 });
    }

    if (!/new\s+ScanCommand\s*\(/.test(code)) {
      return NextResponse.json({ error: "Use ScanCommand to model a DynamoDB Scan request" }, { status: 400 });
    }

    const tableName = code.match(/TableName\s*:\s*["']([^"']+)["']/i)?.[1];
    if (tableName !== "Pokemon") {
      return NextResponse.json({ error: `TableName must be "Pokemon", got "${tableName ?? "missing"}"` }, { status: 400 });
    }

    const stamp = true ? signStamp("quest-3", "code", learnerId) : null;
    return NextResponse.json({
      ...(stamp ? { stamp } : {}),
      success: true,
      emulated: true,
      operation: "Scan",
      count: emulatedPokemon.length,
      scannedCount: emulatedPokemon.length,
      items: emulatedPokemon,
      lastEvaluatedKey: null,
      consumedCapacity: { capacityUnits: 1, simulated: true },
      ...scanTrace(),
    });
  } catch (error) {
    console.error("Scan emulator error:", error);
    return NextResponse.json({ error: "Scan emulator failed" }, { status: 500 });
  }
}
