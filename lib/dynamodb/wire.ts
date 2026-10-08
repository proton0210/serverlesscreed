import { emulatedPokemon } from "./dynamodb-emulator";
import { findPokemon } from "./pokedex";
import type { TraceEvent } from "./trace";

/**
 * Renders the request/response pair behind a trace step in DynamoDB's low-level
 * JSON wire format (typed attribute values, X-Amz-Target header). It is a faithful
 * shape, filled with the simulator's teaching data; nothing is sent anywhere.
 */

type AttributeValue = { S: string } | { N: string } | { BOOL: boolean };
type Item = Record<string, AttributeValue>;

const av = (v: unknown): AttributeValue =>
  typeof v === "number" ? { N: String(v) } : typeof v === "boolean" ? { BOOL: v } : { S: String(v) };

const toItem = (o: Record<string, unknown>): Item => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, av(v)]));

const baseName = (name: string) => name.replace(/\s*\(.*\)$/, "").split(" · ")[0];

/** Full item for a name when the emulator knows it; otherwise just its key. */
function itemFor(name: string): Item {
  const known = emulatedPokemon.find((p) => p.Name === baseName(name));
  if (known) return toItem(known as unknown as Record<string, unknown>);
  const real = findPokemon(name);
  if (real)
    return toItem({
      Name: real.name,
      PokedexNumber: real.dex,
      // Stored types are lowercase across the course (matches the Pokédex CSV and the queries).
      Type1: real.type1.toLowerCase(),
      ...(real.type2 ? { Type2: real.type2.toLowerCase() } : {}),
      HP: real.hp,
      Attack: real.attack,
      Defense: real.defense,
      Speed: real.speed,
    });
  const stats = name.match(/\((\d+)\)$/);
  return toItem(stats ? { Name: baseName(name), Attack: Number(stats[1]) } : { Name: baseName(name) });
}

/** "Level 5", "Type Psychic", "Level 5 → 6", "Owner → Ash" → attribute pairs (final values). */
function changedAttributes(changed: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of changed) {
    const m = c.match(/^([A-Za-z]+)\s*(?:=|→)?\s*(?:.*→\s*)?(.+)$/);
    if (!m || /removed|created|new item/.test(c)) continue;
    const [, k, raw] = m;
    const ttl = raw.match(/^now \+ (\d+) s$/);
    const v = ttl ? String(Math.floor(Date.now() / 1000) + Number(ttl[1])) : raw;
    out[k] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  }
  return out;
}

const KNOWN_NAMES: Record<string, string> = { name: "Name", own: "Owner", level: "Level", status: "Status", type: "Type1" };
const KNOWN_VALUES: Record<string, unknown> = { inc: 1, wins: 1, status: "Champion", trainer: "Ash", expected: "Ash", new: "Gary", level: 6 };

/** Adds ExpressionAttributeNames / ExpressionAttributeValues for every #x and :x the expressions use. */
function addPlaceholders(request: Record<string, unknown>, values: Record<string, unknown>) {
  const text = ["UpdateExpression", "ConditionExpression", "KeyConditionExpression", "FilterExpression"].map((k) => String(request[k] ?? "")).join(" ");
  const names = Array.from(new Set(text.match(/#\w+/g) ?? []));
  const vals = Array.from(new Set(text.match(/:\w+/g) ?? [])).filter((v) => !(request.ExpressionAttributeValues as Record<string, unknown> | undefined)?.[v]);
  if (names.length)
    request.ExpressionAttributeNames = Object.fromEntries(names.map((n) => [n, KNOWN_NAMES[n.slice(1)] ?? n.slice(1).replace(/^./, (c) => c.toUpperCase())]));
  if (vals.length) {
    const byLower = Object.fromEntries(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));
    request.ExpressionAttributeValues = {
      ...(request.ExpressionAttributeValues as object),
      ...Object.fromEntries(vals.map((v) => [v, av(byLower[v.slice(1)] ?? KNOWN_VALUES[v.slice(1)] ?? v.slice(1))])),
    };
  }
}

export type WireExchange = {
  target: string;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  status?: number;
};

/** The request/response exchange that contains event `index - 1` (null before the first request). */
export function wireAt(events: TraceEvent[], index: number): WireExchange | null {
  const upto = Math.min(index, events.length);
  let start = -1;
  for (let i = upto - 1; i >= 0; i--) {
    if (events[i].t === "request") {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const req = events[start] as Extract<TraceEvent, { t: "request" }>;
  let end = events.findIndex((e, i) => i > start && e.t === "request");
  if (end < 0) end = events.length;
  const group = events.slice(start, end);
  const shown = events.slice(start, upto);

  const key = req.key ? toItem(req.key) : undefined;
  const condition = group.find((e) => e.t === "condition") as Extract<TraceEvent, { t: "condition" }> | undefined;
  const write = group.find((e) => e.t === "write") as Extract<TraceEvent, { t: "write" }> | undefined;
  const note = req.note ?? "";

  const request: Record<string, unknown> = { TableName: req.table };
  switch (req.op) {
    case "GetItem":
      request.Key = key;
      break;
    case "PutItem":
      request.Item = { ...key, ...toItem(changedAttributes(write?.changed)) };
      break;
    case "UpdateItem":
    case "DeleteItem": {
      request.Key = key;
      const expr = note.match(/((?:SET|ADD|REMOVE)\s[^.]+?)(?:\s+with\b|\.|"|$)/)?.[1];
      if (req.op === "UpdateItem" && expr) request.UpdateExpression = expr.replace(/^UpdateExpression\s*/, "");
      break;
    }
    case "Query": {
      if (req.index) request.IndexName = req.index;
      const [attr, value] = Object.entries(req.key ?? {})[0] ?? ["pk", ""];
      request.KeyConditionExpression = `${attr} = :pk`;
      request.ExpressionAttributeValues = { ":pk": av(value) };
      if (/ScanIndexForward: false/.test(note)) request.ScanIndexForward = false;
      break;
    }
    case "Scan": {
      const limit = note.match(/Limit:? (\d+)/)?.[1];
      if (limit) request.Limit = Number(limit);
      const esk = note.match(/ExclusiveStartKey \{ Name: "([^"]+)" \}/)?.[1];
      if (esk) request.ExclusiveStartKey = { Name: { S: esk } };
      if (/FilterExpression/.test(note)) request.FilterExpression = note.match(/FilterExpression ([^,.]+)/)?.[1];
      break;
    }
    case "BatchGetItem":
      request.RequestItems = {
        [req.table]: { Keys: String(req.key?.Name ?? "").split(", ").filter(Boolean).map((n) => ({ Name: { S: n } })) },
      };
      delete request.TableName;
      break;
    case "TransactWriteItems":
      request.TransactItems = group
        .filter((e): e is Extract<TraceEvent, { t: "write" }> => e.t === "write")
        .map((w) => ({ Update: { TableName: req.table, Key: { Name: { S: w.item } }, UpdateExpression: "SET #own = :new", ConditionExpression: "#own = :expected" } }));
      delete request.TableName;
      break;
  }
  if (condition && req.op !== "TransactWriteItems") request.ConditionExpression = condition.expr.replace(/\s+\(.*\)$/, "");
  if (req.op === "UpdateItem" && !request.UpdateExpression) {
    const attrs = Object.keys(changedAttributes(write?.changed));
    if (attrs.length) request.UpdateExpression = "SET " + attrs.map((a) => `#${a.toLowerCase()} = :${a.toLowerCase()}`).join(", ");
  }
  addPlaceholders(request, { ...changedAttributes(write?.changed), ...(req.client === "B" ? { trainer: "Gary" } : {}) });
  request.ReturnConsumedCapacity = "TOTAL";

  // The response only exists once the step has reached its response event.
  const done = shown.find((e) => e.t === "response") as Extract<TraceEvent, { t: "response" }> | undefined;
  const failedCondition = shown.find((e) => e.t === "condition" && !e.pass) as Extract<TraceEvent, { t: "condition" }> | undefined;
  const capacityEvents = group.filter((e): e is Extract<TraceEvent, { t: "capacity" }> => e.t === "capacity");
  const units = capacityEvents.reduce((a, c) => a + (c.rcu ?? 0) + (c.wcu ?? 0), 0);
  const consumed = units ? { TableName: req.table, CapacityUnits: units } : undefined;

  let response: Record<string, unknown> | undefined;
  let status: number | undefined;
  if (failedCondition) {
    status = 400;
    response = { __type: "com.amazonaws.dynamodb.v20120810#ConditionalCheckFailedException", message: "The conditional request failed" };
  } else if (done && !done.ok) {
    status = 400;
    response = { __type: `com.amazonaws.dynamodb.v20120810#${done.error ?? "ValidationException"}`, message: done.summary ?? "" };
  } else if (done) {
    status = 200;
    const reads = group.filter((e): e is Extract<TraceEvent, { t: "read" }> => e.t === "read");
    const page = group.find((e) => e.t === "page") as Extract<TraceEvent, { t: "page" }> | undefined;
    const retry = group.find((e) => e.t === "retry") as Extract<TraceEvent, { t: "retry" }> | undefined;
    const items = reads.flatMap((r) => r.items.map(itemFor));
    if (req.op === "GetItem") response = items[0] ? { Item: items[0] } : {};
    else if (req.op === "Query" || req.op === "Scan")
      response = {
        Items: items,
        Count: items.length,
        ScannedCount: reads.reduce((a, r) => a + (r.scanned ?? r.items.length), 0),
        ...(page?.lastEvaluatedKey ? { LastEvaluatedKey: toItem(page.lastEvaluatedKey) } : {}),
      };
    else if (req.op === "BatchGetItem")
      response = {
        Responses: { [req.table]: items },
        UnprocessedKeys: retry ? { [req.table]: { Keys: retry.keys.map((k) => ({ Name: { S: k } })) } } : {},
      };
    else response = {};
    if (consumed) response.ConsumedCapacity = req.op === "BatchGetItem" || req.op === "TransactWriteItems" ? [consumed] : consumed;
  }

  return { target: `DynamoDB_20120810.${req.op}`, request, response, status };
}
