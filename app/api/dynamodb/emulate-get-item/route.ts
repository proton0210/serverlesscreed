import { parse } from "acorn";
import { NextRequest, NextResponse } from "next/server";
import { signStamp } from "@/lib/certificates/stamps";
import { findEmulatedPokemon, starterNames } from "@/lib/dynamodb/dynamodb-emulator";
import { getItemTrace } from "@/lib/dynamodb/emulator-traces";

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

    if (!/new\s+GetCommand\s*\(/.test(code)) {
      return NextResponse.json({ error: "Use GetCommand to model a DynamoDB GetItem request" }, { status: 400 });
    }

    const tableName = code.match(/TableName\s*:\s*["']([^"']+)["']/i)?.[1];
    if (tableName !== "Pokemon") {
      return NextResponse.json({ error: `TableName must be "Pokemon", got "${tableName ?? "missing"}"` }, { status: 400 });
    }

    const pokemonName = code.match(/Key\s*:\s*\{[^}]*Name\s*:\s*["']([^"']+)["']/i)?.[1];
    if (!pokemonName || !starterNames.includes(pokemonName as (typeof starterNames)[number])) {
      return NextResponse.json({ error: `Key.Name must be one of: ${starterNames.join(", ")}` }, { status: 400 });
    }

    const item = findEmulatedPokemon(pokemonName);
    const stamp = Boolean(item) ? signStamp("quest-4", "code", learnerId) : null;
    return NextResponse.json({
      ...(stamp ? { stamp } : {}),
      success: true,
      emulated: true,
      operation: "GetItem",
      pokemonName,
      item,
      found: Boolean(item),
      consumedCapacity: { capacityUnits: 0.5, simulated: true },
      ...getItemTrace(pokemonName, Boolean(item)),
    });
  } catch (error) {
    console.error("GetItem emulator error:", error);
    return NextResponse.json({ error: "GetItem emulator failed" }, { status: 500 });
  }
}
