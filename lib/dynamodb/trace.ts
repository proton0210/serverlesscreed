/**
 * Trace contract shared by the simulator API routes and the scene player.
 *
 * A trace is an ordered list of events describing what DynamoDB did with a
 * request. Routes return it alongside their existing fields; the scene player
 * replays it. Traces are deterministic for the same input so replays match.
 */

export type Op =
  | "GetItem"
  | "PutItem"
  | "UpdateItem"
  | "DeleteItem"
  | "Query"
  | "Scan"
  | "BatchGetItem"
  | "TransactWriteItems";

export type ClientId = "A" | "B";

export type TraceEvent =
  | { t: "request"; op: Op; table: string; index?: string; key?: Record<string, unknown>; client?: ClientId; note?: string }
  | { t: "hash"; key: string; hash: string; partition: number }
  | { t: "condition"; expr: string; pass: boolean; reason?: string }
  | { t: "read"; partition: number; items: string[]; scanned?: number }
  | { t: "write"; partition: number; item: string; mode: "put" | "update" | "delete"; changed?: string[]; client?: ClientId; lost?: boolean }
  | { t: "capacity"; rcu?: number; wcu?: number }
  | { t: "page"; count: number; lastEvaluatedKey?: Record<string, unknown> | null }
  | { t: "retry"; keys: string[]; delayMs: number }
  | { t: "rollback"; items: string[]; reason: string }
  | { t: "expire"; item: string; at: string; visible: boolean }
  | { t: "response"; ok: boolean; error?: string; summary?: string };

export type TraceEventType = TraceEvent["t"];

export type Failure =
  | "syntax"
  | "overwrite"
  | "lostUpdate"
  | "reservedWord"
  | "unsafeDelete"
  | "phantomCreate"
  | "doubleCatch"
  | "partialTrade"
  | "unprocessedKeys"
  | "repeatPage"
  | "wrongIndex"
  | "wrongOrder"
  | "fullScan"
  | "expiredVisible"
  | "hotPartition"
  | "productionGap"
  | "other";

/** Fields added to every simulator/emulator response. Existing fields are unchanged. */
export type TraceFields = {
  trace: TraceEvent[];
  failure?: Failure;
  /** The "what if I skipped this?" trace: what goes wrong without the quest's safeguard. */
  counterfactual?: TraceEvent[];
};

/** Number of partitions the teaching table is drawn with. Real DynamoDB manages this itself. */
export const TEACHING_PARTITIONS = 4;

/**
 * Stand-in for DynamoDB's internal hash function (FNV-1a with a murmur-style finaliser).
 * It is stable and spreads the sample data evenly; it is not DynamoDB's real hash.
 */
export function teachingHash(value: string): number {
  let h = 0x811c9dc5;
  for (const ch of "k161" + value) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

export function hashHex(value: string): string {
  return teachingHash(value).toString(16).padStart(8, "0");
}

export function partitionFor(value: string, partitions = TEACHING_PARTITIONS): number {
  return teachingHash(value) % partitions;
}

/** A request routed by its partition key: request → hash events. */
export function routed(
  op: Op,
  table: string,
  pk: string,
  extra: { key?: Record<string, unknown>; index?: string; client?: ClientId; note?: string } = {},
): { events: TraceEvent[]; partition: number } {
  const partition = partitionFor(pk);
  return {
    partition,
    events: [
      { t: "request", op, table, index: extra.index, key: extra.key ?? { Name: pk }, client: extra.client, note: extra.note },
      { t: "hash", key: pk, hash: hashHex(pk), partition },
    ],
  };
}
