import type { Failure, TraceEvent } from "./trace";

const trim = (text?: string) => (text ?? "").replace(/[.\s]+$/, "");

const who = (client?: string) => (client ? `Trainer ${client === "A" ? "Ash" : "Gary"}` : "Your app");

function keyText(key?: Record<string, unknown>) {
  if (!key) return "";
  return Object.entries(key)
    .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
    .join(", ");
}

/** One plain-language line per trace event, shown under the scene and announced to screen readers. */
export function captionFor(event: TraceEvent): string {
  switch (event.t) {
    case "request": {
      const target = event.index ? `the ${event.index} index` : `the ${event.table} table`;
      const key = event.key ? ` with ${keyText(event.key)}` : "";
      return `${who(event.client)} sends ${event.op} to ${target}${key}.${event.note ? " " + event.note : ""}`;
    }
    case "hash":
      return `DynamoDB hashes ${JSON.stringify(event.key)} to ${event.hash}, which routes the request to partition P${event.partition}.`;
    case "condition":
      return event.pass
        ? `Condition ${event.expr} passes, so the write can go ahead.`
        : `Condition ${event.expr} fails${event.reason ? `: ${event.reason}` : ""}. DynamoDB rejects the write and nothing changes.`;
    case "read":
      return event.scanned && event.scanned > event.items.length
        ? `P${event.partition} reads ${event.scanned} items to return ${event.items.length}${event.items.length ? `: ${event.items.join(", ")}` : ""}.`
        : `P${event.partition} returns ${event.items.length ? event.items.join(", ") : "nothing"}.`;
    case "write": {
      if (event.lost) return `${who(event.client)}'s write to ${event.item} lands on P${event.partition} and silently replaces the other change.`;
      const verb = event.mode === "put" ? "stores" : event.mode === "update" ? "updates" : "deletes";
      const fields = event.changed?.length ? ` (${event.changed.join(", ")})` : "";
      return `P${event.partition} ${verb} ${event.item}${fields}.`;
    }
    case "capacity": {
      const parts = [event.rcu ? `${event.rcu} RCU` : "", event.wcu ? `${event.wcu} WCU` : ""].filter(Boolean);
      return `This call consumed ${parts.join(" and ") || "no capacity"}.`;
    }
    case "page":
      return event.lastEvaluatedKey
        ? `The page holds ${event.count} items and ends with LastEvaluatedKey ${JSON.stringify(event.lastEvaluatedKey)}. Pass it as ExclusiveStartKey to continue.`
        : `The page holds ${event.count} items. No LastEvaluatedKey, so this was the last page.`;
    case "retry":
      return `${event.keys.join(", ")} came back in UnprocessedKeys. Wait ${event.delayMs} ms, then retry just those keys.`;
    case "rollback":
      return `Transaction cancelled: ${event.reason}. ${event.items.join(" and ")} are left exactly as they were.`;
    case "expire":
      return event.visible
        ? `${event.item}'s ExpirationTime (${event.at}) has passed, but TTL deletes asynchronously, so reads can still return it until the sweeper runs.`
        : `The TTL sweeper removes ${event.item}. It no longer appears in reads.`;
    case "response":
      return event.ok
        ? `DynamoDB responds with success${event.summary ? `: ${trim(event.summary)}` : ""}.`
        : `DynamoDB responds with ${event.error ?? "an error"}${event.summary ? `: ${trim(event.summary)}` : ""}.`;
  }
}

/** Heading for the "what went wrong" panel, per failure type. */
export const failureTitles: Record<Failure, string> = {
  syntax: "The code doesn't parse",
  overwrite: "Silent overwrite",
  lostUpdate: "Lost update",
  reservedWord: "Reserved word rejected",
  unsafeDelete: "Unsafe delete",
  phantomCreate: "Phantom item created",
  doubleCatch: "Two trainers, one Lugia",
  partialTrade: "Half-finished trade",
  unprocessedKeys: "Dropped UnprocessedKeys",
  repeatPage: "Page 1 again",
  wrongIndex: "Full-table Scan instead of an index",
  wrongOrder: "Wrong sort order",
  fullScan: "Scan reads every item",
  expiredVisible: "Expired item still visible",
  hotPartition: "Hot partition",
  productionGap: "Production gap",
  other: "Not quite",
};
