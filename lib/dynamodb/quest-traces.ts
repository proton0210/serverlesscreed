import { hashHex, partitionFor, routed, type Failure, type Op, type TraceEvent, type TraceFields } from "./trace";

type SimBody = { success?: boolean; message?: string; error?: string; data?: unknown };

const clean = (message?: string) => (message ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

function rejected(error: string, summary: string): TraceEvent {
  return { t: "response", ok: false, error, summary };
}

/** Request with a key the learner would send, routed to its partition. */
function req(op: Op, table: string, pk: string, extra?: Parameters<typeof routed>[3]) {
  return routed(op, table, pk, extra);
}

// ---------------------------------------------------------------------------
// Per-quest scenarios. `success` = the learner's passing code; `counterfactual`
// = the same moment without the quest's safeguard; `failures` = the trace shown
// for each failure type the validator can detect.
// ---------------------------------------------------------------------------

type Scenario = {
  op: Op;
  table: string;
  success: () => TraceEvent[];
  counterfactual?: () => TraceEvent[];
  /** Maps a failing validator message to a failure type (syntax and reserved words are handled globally). */
  classify?: (body: SimBody) => Failure | undefined;
  failureTrace?: Partial<Record<Failure, () => TraceEvent[]>>;
};

const mewPut = (): TraceEvent[] => {
  const r = req("PutItem", "Pokemon", "Mew");
  return [
    ...r.events,
    { t: "condition", expr: "attribute_not_exists(#name)", pass: true },
    { t: "write", partition: r.partition, item: "Mew", mode: "put", changed: ["Type Psychic", "Level 5", "Status Caught"] },
    { t: "capacity", wcu: 1 },
    { t: "response", ok: true, summary: "Mew joined the party" },
  ];
};

const mewOverwrite = (): TraceEvent[] => {
  const r = req("PutItem", "Pokemon", "Mew", { note: "No ConditionExpression, and a Level 50 Mew is already stored." });
  return [
    ...r.events,
    { t: "write", partition: r.partition, item: "Mew", mode: "put", changed: ["Level 50 → 5"], lost: true },
    { t: "capacity", wcu: 1 },
    { t: "response", ok: true, summary: "the Level 50 Mew was replaced by a fresh Level 5 copy, with no error" },
  ];
};

const scenarios: Record<string, Scenario> = {
  "quest-5": {
    op: "PutItem",
    table: "Pokemon",
    success: mewPut,
    counterfactual: mewOverwrite,
    classify: (b) => (b.error === "ConditionalCheckFailedException" ? "overwrite" : undefined),
    failureTrace: { overwrite: mewOverwrite },
  },
  "quest-6": {
    op: "UpdateItem",
    table: "Pokemon",
    success: () => {
      const r = req("UpdateItem", "Pokemon", "Mew");
      return [
        ...r.events,
        { t: "write", partition: r.partition, item: "Mew", mode: "update", changed: ["Level 5 → 6"] },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "only Level changed; Type and Status are untouched" },
      ];
    },
    counterfactual: () => {
      const r = req("PutItem", "Pokemon", "Mew", { note: "Using PutItem with just Name and Level instead of UpdateItem." });
      return [
        ...r.events,
        { t: "write", partition: r.partition, item: "Mew", mode: "put", changed: ["Level 6", "Type removed", "Status removed"], lost: true },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "PutItem replaced the whole item, so Mew lost its Type and Status" },
      ];
    },
  },
  "quest-7": {
    op: "UpdateItem",
    table: "Pokemon",
    success: () => {
      const a = req("UpdateItem", "Pokemon", "Mew", { client: "A", note: "UpdateExpression ADD BattlesWon :inc" });
      const b = req("UpdateItem", "Pokemon", "Mew", { client: "B", note: "At the same moment, ADD BattlesWon :inc" });
      return [
        ...a.events,
        { t: "write", partition: a.partition, item: "Mew", mode: "update", changed: ["BattlesWon 0 → 1"], client: "A" },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "Ash's win counted" },
        ...b.events,
        { t: "write", partition: b.partition, item: "Mew", mode: "update", changed: ["BattlesWon 1 → 2"], client: "B" },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "two wins, BattlesWon = 2" },
      ];
    },
    counterfactual: () => {
      const p = partitionFor("Mew");
      return [
        ...req("GetItem", "Pokemon", "Mew", { client: "A", note: "Read the counter first." }).events,
        { t: "read", partition: p, items: ["Mew (BattlesWon 0)"] },
        ...req("GetItem", "Pokemon", "Mew", { client: "B", note: "Reads before A has written." }).events,
        { t: "read", partition: p, items: ["Mew (BattlesWon 0)"] },
        ...req("UpdateItem", "Pokemon", "Mew", { client: "A", note: "Writes back 0 + 1: SET BattlesWon = :wins" }).events,
        { t: "write", partition: p, item: "Mew", mode: "update", changed: ["BattlesWon = 1"], client: "A" },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "Ash's write succeeded" },
        ...req("UpdateItem", "Pokemon", "Mew", { client: "B", note: "Also writes back 0 + 1: SET BattlesWon = :wins" }).events,
        { t: "write", partition: p, item: "Mew", mode: "update", changed: ["BattlesWon = 1"], client: "B", lost: true },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "two wins recorded, but BattlesWon shows 1" },
      ];
    },
    classify: (b) => (/ADD/.test(b.message ?? "") ? "lostUpdate" : undefined),
  },
  "quest-8": {
    op: "DeleteItem",
    table: "Pokemon",
    success: () => {
      const r = req("DeleteItem", "Pokemon", "Mew");
      return [
        ...r.events,
        { t: "condition", expr: "attribute_exists(#name) AND #own = :trainer", pass: true },
        { t: "write", partition: r.partition, item: "Mew", mode: "delete" },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "Ash's Mew was released" },
      ];
    },
    counterfactual: () => {
      const r = req("DeleteItem", "Pokemon", "Mew", { note: "No condition. Mew was traded to Gary a minute ago." });
      return [
        ...r.events,
        { t: "write", partition: r.partition, item: "Mew (Owner Gary)", mode: "delete", lost: true },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "Gary's Mew is gone and nobody was warned" },
      ];
    },
    classify: (b) => (b.error === "SafetyCheckFailed" ? "unsafeDelete" : undefined),
  },
  "quest-expressions": {
    op: "UpdateItem",
    table: "Pokemon",
    success: () => {
      const r = req("UpdateItem", "Pokemon", "Mew", { note: 'SET #status = :status with #status → "Status"' });
      return [
        ...r.events,
        { t: "write", partition: r.partition, item: "Mew", mode: "update", changed: ["Status → Champion"] },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "the alias let DynamoDB accept the reserved word" },
      ];
    },
    counterfactual: () => [
      ...req("UpdateItem", "Pokemon", "Mew", { note: 'UpdateExpression "SET Status = :status"' }).events,
      rejected("ValidationException", "Status is a reserved keyword, so the expression is rejected before anything is written"),
    ],
  },
  "quest-9": {
    op: "Query",
    table: "JohtoPokemon",
    success: () => {
      const r = req("Query", "JohtoPokemon", "Water", { index: "Type1-Index", key: { Type1: "water" } });
      return [
        ...r.events,
        { t: "read", partition: r.partition, items: ["Totodile", "Feraligatr", "Quagsire"] },
        { t: "capacity", rcu: 0.5 },
        { t: "page", count: 3, lastEvaluatedKey: null },
        { t: "response", ok: true, summary: "3 Water types read from one index partition" },
      ];
    },
    counterfactual: () => [
      { t: "request", op: "Scan", table: "JohtoPokemon", note: "FilterExpression Type1 = :type, no index." },
      { t: "read", partition: 0, items: ["Totodile"], scanned: 25 },
      { t: "read", partition: 1, items: ["Feraligatr"], scanned: 25 },
      { t: "read", partition: 2, items: [], scanned: 25 },
      { t: "read", partition: 3, items: ["Quagsire"], scanned: 25 },
      // ~200-byte items: 20 KB read = 5 × 4 KB units × 0.5 (eventually consistent) = 2.5 RCU.
      { t: "capacity", rcu: 2.5 },
      { t: "response", ok: true, summary: "100 items read and paid for to return 3" },
    ],
    classify: (b) => (/IndexName|not a Scan/.test(b.message ?? "") ? "wrongIndex" : undefined),
  },
  "quest-10": {
    op: "Query",
    table: "JohtoPokemon",
    success: () => {
      const r = req("Query", "JohtoPokemon", "Fire", { index: "Type1-Attack-Index", key: { Type1: "fire" }, note: "ScanIndexForward: false" });
      return [
        ...r.events,
        { t: "read", partition: r.partition, items: ["Ho-Oh (130)", "Typhlosion (84)", "Cyndaquil (52)"] },
        { t: "capacity", rcu: 0.5 },
        { t: "response", ok: true, summary: "sorted by Attack, strongest first" },
      ];
    },
    counterfactual: () => {
      const r = req("Query", "JohtoPokemon", "Fire", { index: "Type1-Attack-Index", key: { Type1: "fire" }, note: "ScanIndexForward left at its default (true)." });
      return [
        ...r.events,
        { t: "read", partition: r.partition, items: ["Cyndaquil (52)", "Typhlosion (84)", "Ho-Oh (130)"] },
        { t: "capacity", rcu: 0.5 },
        { t: "response", ok: true, summary: "ascending order, so the weakest comes back first" },
      ];
    },
    classify: (b) => (/ScanIndexForward/.test(b.message ?? "") ? "wrongOrder" : /IndexName/.test(b.message ?? "") ? "wrongIndex" : undefined),
  },
  "quest-11": {
    op: "UpdateItem",
    table: "JohtoPokemon",
    success: () => {
      const a = req("UpdateItem", "JohtoPokemon", "Lugia", { client: "A", note: "SET #own = :trainer" });
      const b = req("UpdateItem", "JohtoPokemon", "Lugia", { client: "B", note: "Throws a ball at the same moment: SET #own = :trainer" });
      const cond = "attribute_exists(#name) AND attribute_not_exists(#own)";
      return [
        ...a.events,
        { t: "condition", expr: cond, pass: true },
        { t: "write", partition: a.partition, item: "Lugia", mode: "update", changed: ["Owner → Ash"], client: "A" },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "Ash caught Lugia" },
        ...b.events,
        { t: "condition", expr: cond, pass: false, reason: "Lugia already has an Owner" },
        { t: "response", ok: true, summary: "exactly one trainer caught Lugia; Gary got ConditionalCheckFailedException" },
      ];
    },
    counterfactual: () => {
      const a = req("UpdateItem", "JohtoPokemon", "Lugia", { client: "A", note: "No ConditionExpression: SET #own = :trainer" });
      const b = req("UpdateItem", "JohtoPokemon", "Lugia", { client: "B", note: "No ConditionExpression: SET #own = :trainer" });
      return [
        ...a.events,
        { t: "write", partition: a.partition, item: "Lugia", mode: "update", changed: ["Owner → Ash"], client: "A" },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "Ash caught Lugia" },
        ...b.events,
        { t: "write", partition: b.partition, item: "Lugia", mode: "update", changed: ["Owner Ash → Gary"], client: "B", lost: true },
        { t: "response", ok: true, summary: "both trainers were told they caught Lugia" },
      ];
    },
    classify: (b) => (/phantom/i.test(b.message ?? "") ? "phantomCreate" : b.error === "ConditionalCheckFailedException" ? "doubleCatch" : undefined),
    failureTrace: {
      phantomCreate: () => {
        const r = req("UpdateItem", "JohtoPokemon", "Lugla", { key: { Name: "Lugla" }, note: "A typo in the key, and only attribute_not_exists(#own) is checked." });
        return [
          ...r.events,
          { t: "condition", expr: "attribute_not_exists(#own)", pass: true, reason: "a missing item has no Owner either" },
          { t: "write", partition: r.partition, item: "Lugla", mode: "update", changed: ["new item with only Owner"], lost: true },
          { t: "response", ok: true, summary: "UpdateItem created a phantom Lugla item" },
        ];
      },
    },
  },
  "quest-12": {
    op: "TransactWriteItems",
    table: "JohtoPokemon",
    success: () => {
      const ps = partitionFor("Scyther");
      const po = partitionFor("Onix");
      return [
        { t: "request", op: "TransactWriteItems", table: "JohtoPokemon", key: { Name: "Scyther + Onix" } },
        { t: "hash", key: "Scyther", hash: hashHex("Scyther"), partition: ps },
        { t: "hash", key: "Onix", hash: hashHex("Onix"), partition: po },
        { t: "condition", expr: "#own = :expected (Scyther is Ash's)", pass: true },
        { t: "condition", expr: "#own = :expected (Onix is Gary's)", pass: true },
        { t: "write", partition: ps, item: "Scyther", mode: "update", changed: ["Owner Ash → Gary"] },
        { t: "write", partition: po, item: "Onix", mode: "update", changed: ["Owner Gary → Ash"] },
        { t: "capacity", wcu: 4 },
        { t: "response", ok: true, summary: "both sides committed together" },
      ];
    },
    counterfactual: () => {
      const s = req("UpdateItem", "JohtoPokemon", "Scyther", { note: "Two separate writes, no transaction." });
      const o = req("UpdateItem", "JohtoPokemon", "Onix");
      return [
        ...s.events,
        { t: "write", partition: s.partition, item: "Scyther", mode: "update", changed: ["Owner Ash → Gary"] },
        ...o.events,
        rejected("RequestTimeout", "the second write never landed: Gary has both Pokémon and Ash has neither"),
      ];
    },
    classify: () => "partialTrade",
  },
  "quest-13": {
    op: "BatchGetItem",
    table: "JohtoPokemon",
    success: () => {
      const names = ["Chikorita", "Cyndaquil", "Totodile"];
      const events: TraceEvent[] = [{ t: "request", op: "BatchGetItem", table: "JohtoPokemon", key: { Name: names.join(", ") } }];
      names.forEach((n) => events.push({ t: "hash", key: n, hash: hashHex(n), partition: partitionFor(n) }));
      events.push({ t: "read", partition: partitionFor("Chikorita"), items: ["Chikorita"] });
      events.push({ t: "read", partition: partitionFor("Cyndaquil"), items: ["Cyndaquil"] });
      events.push({ t: "retry", keys: ["Totodile"], delayMs: 100 });
      events.push({ t: "request", op: "BatchGetItem", table: "JohtoPokemon", key: { Name: "Totodile" }, note: "Retrying only the unprocessed key." });
      events.push({ t: "read", partition: partitionFor("Totodile"), items: ["Totodile"] });
      events.push({ t: "capacity", rcu: 1.5 });
      events.push({ t: "response", ok: true, summary: "full party of 3 loaded" });
      return events;
    },
    counterfactual: () => {
      const names = ["Chikorita", "Cyndaquil", "Totodile"];
      const events: TraceEvent[] = [{ t: "request", op: "BatchGetItem", table: "JohtoPokemon", key: { Name: names.join(", ") } }];
      names.forEach((n) => events.push({ t: "hash", key: n, hash: hashHex(n), partition: partitionFor(n) }));
      events.push({ t: "read", partition: partitionFor("Chikorita"), items: ["Chikorita"] });
      events.push({ t: "read", partition: partitionFor("Cyndaquil"), items: ["Cyndaquil"] });
      events.push({ t: "response", ok: true, summary: "2 of 3 returned. Totodile sat in UnprocessedKeys and was never retried" });
      return events;
    },
    classify: (b) => (/UnprocessedKeys/.test(b.message ?? "") ? "unprocessedKeys" : undefined),
  },
  "quest-14": {
    op: "Scan",
    table: "JohtoPokemon",
    success: () => [
      { t: "request", op: "Scan", table: "JohtoPokemon", note: 'Limit 3, ExclusiveStartKey { Name: "Meganium" }' },
      { t: "read", partition: partitionFor("Chinchou"), items: ["Chinchou", "Lanturn", "Pichu"] },
      { t: "capacity", rcu: 0.5 },
      { t: "page", count: 3, lastEvaluatedKey: { Name: "Pichu" } },
      { t: "response", ok: true, summary: "page 2 picked up right after Meganium" },
    ],
    counterfactual: () => [
      { t: "request", op: "Scan", table: "JohtoPokemon", note: "Limit 3, no ExclusiveStartKey." },
      { t: "read", partition: partitionFor("Chikorita"), items: ["Chikorita", "Bayleef", "Meganium"] },
      { t: "capacity", rcu: 0.5 },
      { t: "page", count: 3, lastEvaluatedKey: { Name: "Meganium" } },
      { t: "response", ok: true, summary: "the same first page again, so the list never advances" },
    ],
    classify: (b) => (/ExclusiveStartKey/.test(b.message ?? "") ? "repeatPage" : undefined),
  },
  "quest-15": {
    op: "PutItem",
    table: "StatusEffects",
    success: () => {
      const r = req("PutItem", "StatusEffects", "Pikachu", { key: { PokemonId: "Pikachu", Effect: "Burn" } });
      return [
        ...r.events,
        { t: "write", partition: r.partition, item: "Pikachu · Burn", mode: "put", changed: ["ExpirationTime = now + 300 s"] },
        { t: "capacity", wcu: 1 },
        { t: "response", ok: true, summary: "Burn stored with an expiry" },
        { t: "expire", item: "Pikachu · Burn", at: "now + 300 s", visible: true },
        { t: "expire", item: "Pikachu · Burn", at: "now + 300 s", visible: false },
      ];
    },
    counterfactual: () => {
      const r = req("GetItem", "StatusEffects", "Pikachu", { key: { PokemonId: "Pikachu", Effect: "Burn" }, note: "Six minutes later, reading without checking ExpirationTime." });
      return [
        { t: "expire", item: "Pikachu · Burn", at: "now + 300 s", visible: true },
        ...r.events,
        { t: "read", partition: r.partition, items: ["Pikachu · Burn (expired)"] },
        { t: "response", ok: true, summary: "the Burn is still applied because the read didn't filter expired items" },
      ];
    },
    classify: () => "expiredVisible",
  },
  "quest-16": {
    op: "PutItem",
    table: "BattleFeed",
    success: () => [{ t: "response", ok: true, summary: "Elite Four approved the production review" }],
    classify: () => "productionGap",
  },
};

const SYNTAX = /syntax error/i;
const RESERVED = /reserved word|alias the reserved|ExpressionAttributeNames: \{/i;

/**
 * Builds the trace fields for a simulate-quest response. Unknown quest ids get a
 * bare response event so the contract ("trace is always present") holds.
 */
export function traceForQuest(questId: string | undefined, body: SimBody): TraceFields {
  const scenario = questId ? scenarios[questId] : undefined;
  if (!scenario) {
    return { trace: [{ t: "response", ok: Boolean(body.success), error: body.error, summary: clean(body.message) }] };
  }

  const counterfactual = scenario.counterfactual?.();
  if (body.success) return { trace: scenario.success(), counterfactual };

  let failure: Failure;
  if (SYNTAX.test(body.message ?? "")) failure = "syntax";
  else if (RESERVED.test(body.message ?? "") || body.error === "ValidationException") failure = "reservedWord";
  else failure = scenario.classify?.(body) ?? "other";

  const custom = scenario.failureTrace?.[failure];
  let trace: TraceEvent[];
  if (custom) trace = custom();
  else if (failure === "syntax") trace = [rejected("SyntaxError", clean(body.message))];
  else if (failure === "reservedWord")
    trace = [{ t: "request", op: scenario.op, table: scenario.table, note: "The expression uses a reserved word directly." }, rejected("ValidationException", clean(body.message))];
  else if (failure !== "other" && failure !== "productionGap" && counterfactual) trace = counterfactual;
  else trace = [rejected(body.error ?? "ValidationError", clean(body.message))];

  return { trace, failure, counterfactual };
}

export const tracedQuestIds = Object.keys(scenarios);
