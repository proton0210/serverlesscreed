import { emulatedPokemon } from "./dynamodb-emulator";
import { partitionFor, routed, TEACHING_PARTITIONS, type TraceEvent, type TraceFields } from "./trace";

function scanReads(match?: (name: string) => boolean): TraceEvent[] {
  const events: TraceEvent[] = [];
  for (let p = 0; p < TEACHING_PARTITIONS; p++) {
    const onPartition = emulatedPokemon.filter((x) => partitionFor(x.Name) === p).map((x) => x.Name);
    if (!onPartition.length) continue;
    events.push({ t: "read", partition: p, items: match ? onPartition.filter(match) : onPartition, scanned: onPartition.length });
  }
  return events;
}

/** Trace for the Scan emulator: every partition is read. */
export function scanTrace(): TraceFields {
  return {
    trace: [
      { t: "request", op: "Scan", table: "Pokemon" },
      ...scanReads(),
      { t: "capacity", rcu: 1 },
      { t: "page", count: emulatedPokemon.length, lastEvaluatedKey: null },
      { t: "response", ok: true, summary: `${emulatedPokemon.length} items, every partition read` },
    ],
  };
}

/** Trace for the GetItem emulator, with a Scan counterfactual for comparison. */
export function getItemTrace(name: string, found: boolean): TraceFields {
  const r = routed("GetItem", "Pokemon", name);
  return {
    trace: [
      ...r.events,
      { t: "read", partition: r.partition, items: found ? [name] : [] },
      { t: "capacity", rcu: 0.5 },
      { t: "response", ok: true, summary: found ? `one partition, one item: ${name}` : "no item with that key" },
    ],
    counterfactual: [
      { t: "request", op: "Scan", table: "Pokemon", note: `FilterExpression Name = "${name}"` },
      ...scanReads((n) => n === name),
      { t: "capacity", rcu: 1 },
      { t: "response", ok: true, summary: `${emulatedPokemon.length} items read and paid for to find 1` },
    ],
  };
}
