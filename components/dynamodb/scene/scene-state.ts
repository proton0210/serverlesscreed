import { TEACHING_PARTITIONS, type ClientId, type TraceEvent } from "@/lib/dynamodb/trace";

export type ChipState = "stored" | "read" | "written" | "lost" | "deleted" | "expired" | "rolledBack";

export type Chip = { name: string; state: ChipState; note?: string };

export type PacketSpot =
  | { at: "client"; client: ClientId | "app" }
  | { at: "db" }
  | { at: "partition"; partition: number }
  | { at: "hidden" };

export type SceneState = {
  partitions: Chip[][];
  activePartitions: number[];
  clients: (ClientId | "app")[];
  activeClient: ClientId | "app";
  packet: PacketSpot;
  packetTone: "request" | "read" | "write" | "ok" | "error";
  op?: string;
  table?: string;
  index?: string;
  hash?: string;
  gate?: { expr: string; pass: boolean };
  rcu: number;
  wcu: number;
  bookmark?: string;
  retry?: { keys: string[]; delayMs: number };
  banner?: { tone: "ok" | "error" | "warn"; text: string };
  /** warn = DynamoDB reported success, but the scene lost or clobbered data. */
  response?: { ok: boolean; warn?: boolean; text: string };
};

const clientOf = (c?: ClientId) => (c ?? "app") as ClientId | "app";

/** "Mew (BattlesWon 0)" → { name: "Mew", note: "BattlesWon 0" } so one item keeps one chip. */
function split(label: string): { name: string; note?: string } {
  const m = label.match(/^(.*?)\s*\((.+)\)$/);
  return m ? { name: m[1], note: m[2] } : { name: label };
}

function upsert(list: Chip[], chip: Chip) {
  const i = list.findIndex((c) => c.name === chip.name);
  if (i >= 0) list[i] = chip;
  else list.push(chip);
}

/** Pure reducer: the scene after applying events[0..count). */
export function sceneAt(events: TraceEvent[], count: number): SceneState {
  const clientsSeen = new Set<ClientId | "app">();
  events.forEach((e) => {
    if (e.t === "request" || e.t === "write") clientsSeen.add(clientOf(e.client));
  });
  const clients = clientsSeen.size ? Array.from(clientsSeen) : (["app"] as const).slice();

  const s: SceneState = {
    partitions: Array.from({ length: TEACHING_PARTITIONS }, () => []),
    activePartitions: [],
    clients: clients as SceneState["clients"],
    activeClient: clients[0],
    packet: { at: "hidden" },
    packetTone: "request",
    rcu: 0,
    wcu: 0,
  };

  for (let i = 0; i < count && i < events.length; i++) {
    const e = events[i];
    const last = i === count - 1;
    // Transient highlights only belong to the latest event.
    s.activePartitions = [];
    if (!last) s.partitions.forEach((p) => p.forEach((c) => c.state === "read" && (c.state = "stored")));

    switch (e.t) {
      case "request":
        s.activeClient = clientOf(e.client);
        s.op = e.op;
        s.table = e.table;
        s.index = e.index;
        s.hash = undefined;
        s.gate = undefined;
        s.response = undefined;
        s.retry = undefined;
        s.packet = { at: "db" };
        s.packetTone = "request";
        break;
      case "hash":
        s.hash = `${JSON.stringify(e.key)} → P${e.partition}`;
        s.activePartitions = [e.partition];
        s.packet = { at: "db" };
        break;
      case "condition":
        s.gate = { expr: e.expr, pass: e.pass };
        s.packet = { at: "db" };
        s.packetTone = e.pass ? "request" : "error";
        break;
      case "read":
        s.activePartitions = [e.partition];
        e.items.forEach((label) => upsert(s.partitions[e.partition], { ...split(label), state: "read" }));
        s.packet = { at: "partition", partition: e.partition };
        s.packetTone = "read";
        break;
      case "write": {
        s.activeClient = e.client ? e.client : s.activeClient;
        s.activePartitions = [e.partition];
        const note = e.changed?.join(", ");
        const state: ChipState = e.lost ? "lost" : e.mode === "delete" ? "deleted" : "written";
        upsert(s.partitions[e.partition], { name: split(e.item).name, state, note: note ?? split(e.item).note });
        s.packet = { at: "partition", partition: e.partition };
        s.packetTone = e.lost ? "error" : "write";
        break;
      }
      case "capacity":
        s.rcu += e.rcu ?? 0;
        s.wcu += e.wcu ?? 0;
        break;
      case "page":
        s.bookmark = e.lastEvaluatedKey ? `LastEvaluatedKey ${JSON.stringify(e.lastEvaluatedKey)}` : "Last page";
        break;
      case "retry":
        s.retry = { keys: e.keys, delayMs: e.delayMs };
        s.packet = { at: "db" };
        s.packetTone = "error";
        break;
      case "rollback":
        s.partitions.forEach((p) => p.forEach((c) => e.items.includes(c.name) && (c.state = "rolledBack")));
        s.banner = { tone: "warn", text: `Rolled back: ${e.reason}` };
        break;
      case "expire":
        s.partitions.forEach((p, pi) => {
          const idx = p.findIndex((c) => c.name.startsWith(e.item));
          if (idx >= 0) {
            if (e.visible) p[idx] = { ...p[idx], state: "expired", note: "expired, not yet deleted" };
            else p.splice(idx, 1);
            s.activePartitions = [pi];
          }
        });
        break;
      case "response":
        s.packet = { at: "client", client: s.activeClient };
        s.packetTone = e.ok ? "ok" : "error";
        s.response = {
          ok: e.ok,
          warn: e.ok && s.partitions.some((p) => p.some((c) => c.state === "lost")),
          text: e.ok ? e.summary ?? "Success" : `${e.error ?? "Error"}${e.summary ? `: ${e.summary}` : ""}`,
        };
        break;
    }
    if (!last && s.packet.at !== "hidden" && e.t === "response") s.packet = { at: "hidden" };
  }
  if (count === 0) s.packet = { at: "client", client: s.activeClient };
  return s;
}
