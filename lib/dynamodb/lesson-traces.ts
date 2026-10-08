import { getItemTrace, scanTrace } from "./emulator-traces";
import { traceForQuest } from "./quest-traces";
import { routed, type TraceEvent } from "./trace";

export type LessonStep = { label: string; tone: "fail" | "fix" | "neutral"; events: TraceEvent[] };

export type Prediction = {
  /** Index into steps: the scene pauses before that step's final response event. */
  step: number;
  question: string;
  options: string[];
  answerIndex: number;
  explain: string;
  /** Which event to stop before: the first lost write (default when present), the last read, or the final response. */
  pauseBefore?: "lost" | "read" | "response";
};

/** Event index at which the scene pauses to ask the prediction question. */
export function predictionPauseIndex(events: TraceEvent[], p: Prediction): number {
  const lost = events.findIndex((e) => e.t === "write" && e.lost);
  const lastRead = events.map((e) => e.t).lastIndexOf("read");
  const response = events.map((e) => e.t).lastIndexOf("response");
  if (p.pauseBefore === "read" && lastRead >= 0) return lastRead;
  if (p.pauseBefore !== "response" && lost >= 0) return lost;
  return response >= 0 ? response : events.length - 1;
}

export type LessonSequence = { steps: LessonStep[]; threeD: boolean; predict?: Prediction };

function putGet(): TraceEvent[] {
  const put = routed("PutItem", "Pokemon", "Pikachu");
  const get = routed("GetItem", "Pokemon", "Pikachu");
  return [
    ...put.events,
    { t: "write", partition: put.partition, item: "Pikachu", mode: "put", changed: ["Type Electric", "Level 5"] },
    { t: "capacity", wcu: 1 },
    { t: "response", ok: true, summary: "Pikachu stored under its Name" },
    ...get.events,
    { t: "read", partition: get.partition, items: ["Pikachu"] },
    { t: "capacity", rcu: 0.5 },
    { t: "response", ok: true, summary: "one key, one partition, one item" },
  ];
}

function samePutTwice(): TraceEvent[] {
  const first = routed("PutItem", "Pokemon", "Pikachu");
  const second = routed("PutItem", "Pokemon", "Pikachu", { note: "Same Name, different Level." });
  return [
    ...first.events,
    { t: "write", partition: first.partition, item: "Pikachu", mode: "put", changed: ["Level 25"] },
    { t: "response", ok: true, summary: "Pikachu (Level 25) stored" },
    ...second.events,
    { t: "write", partition: second.partition, item: "Pikachu", mode: "put", changed: ["Level 25 → 5"], lost: true },
    { t: "response", ok: true, summary: "the second PutItem replaced the first item, because the primary key is the item's identity" },
  ];
}

const WITHOUT_WITH: Record<string, [string, string]> = {
  "quest-5": ["PutItem without a condition", "PutItem with attribute_not_exists"],
  "quest-6": ["PutItem to change one field", "UpdateItem SET #level"],
  "quest-7": ["Read, add 1, write back", "UpdateItem ADD BattlesWon"],
  "quest-8": ["DeleteItem without a condition", "DeleteItem with an owner check"],
  "quest-expressions": ["Status used directly", "#status alias + :status value"],
  "quest-9": ["Scan with a filter", "Query the Type1-Index GSI"],
  "quest-10": ["Default sort order", "ScanIndexForward: false"],
  "quest-11": ["Two trainers, no condition", "Conditional catch"],
  "quest-12": ["Two separate writes", "TransactWriteItems"],
  "quest-13": ["Ignoring UnprocessedKeys", "Retrying UnprocessedKeys"],
  "quest-14": ["No ExclusiveStartKey", "ExclusiveStartKey from the last page"],
  "quest-15": ["Reading without checking expiry", "TTL + filtered reads"],
};

const PREDICTIONS: Record<string, Omit<Prediction, "step">> = {
  "quest-2": {
    question: "A second PutItem arrives with the same Name. What does DynamoDB do?",
    options: ["Rejects it with an error", "Replaces the existing item", "Stores a second Pikachu"],
    answerIndex: 1,
    explain: "PutItem replaces any item with the same primary key unless you add a condition.",
  },
  "quest-5": {
    question: "Mew is already stored at Level 50. What does an unconditional PutItem do?",
    options: ["Fails with ConditionalCheckFailedException", "Silently replaces it with Level 5", "Stores a second Mew"],
    answerIndex: 1,
    explain: "Without a ConditionExpression, PutItem overwrites and still reports success.",
  },
  "quest-7": {
    question: "Both trainers read BattlesWon = 0 and write back 1. What is the final count?",
    options: ["2", "1", "An error"],
    answerIndex: 1,
    explain: "Read-modify-write loses one update. ADD applies both increments at the item.",
  },
  "quest-11": {
    question: "Without a condition, both trainers update Lugia's Owner. Who is told they caught it?",
    options: ["Only the first trainer", "Both trainers", "Neither"],
    answerIndex: 1,
    explain: "Both writes succeed; the second silently overwrites the first owner.",
  },
  "quest-12": {
    question: "Scyther's write succeeded but Onix's timed out. What state is the trade in?",
    options: ["Both roll back automatically", "Gary has both Pokémon", "Ash has both Pokémon"],
    answerIndex: 1,
    explain: "Separate writes aren't atomic. TransactWriteItems commits both or neither.",
  },
  "quest-13": {
    question: "Totodile came back in UnprocessedKeys. What does the app show if it doesn't retry?",
    options: ["All three Pokémon", "Two of three, with Totodile missing", "An error"],
    answerIndex: 1,
    explain: "BatchGetItem can return partial results; retrying UnprocessedKeys is your job.",
  },
  "quest-15": {
    question: "The Burn's ExpirationTime passed a minute ago. Can a GetItem still return it?",
    options: ["No, it is deleted exactly on time", "Yes, until the TTL sweeper removes it"],
    answerIndex: 1,
    explain: "TTL deletion is asynchronous, so filter out expired items in reads.",
    pauseBefore: "read",
  },
};

/** The lesson animation for a quest: the failure first, then the fix. */
export function lessonSequence(questId: string): LessonSequence | null {
  const predict = PREDICTIONS[questId];
  if (questId === "quest-2") {
    return {
      threeD: false,
      steps: [
        { label: "PutItem, then GetItem", tone: "neutral", events: putGet() },
        { label: "Same key, second PutItem", tone: "fail", events: samePutTwice() },
      ],
      predict: predict && { ...predict, step: 1 },
    };
  }
  if (questId === "quest-3") {
    return { threeD: true, steps: [{ label: "Scan the whole table", tone: "neutral", events: scanTrace().trace }] };
  }
  if (questId === "quest-4") {
    const g = getItemTrace("Bulbasaur", true);
    return {
      threeD: true,
      steps: [
        { label: "Scan to find Bulbasaur", tone: "fail", events: g.counterfactual ?? [] },
        { label: "GetItem Bulbasaur", tone: "fix", events: g.trace },
      ],
    };
  }
  const labels = WITHOUT_WITH[questId];
  if (!labels) return null;
  const t = traceForQuest(questId, { success: true });
  if (!t.counterfactual) return null;
  return {
    threeD: questId === "quest-9" || questId === "quest-10",
    steps: [
      { label: labels[0], tone: "fail", events: t.counterfactual },
      { label: labels[1], tone: "fix", events: t.trace },
    ],
    predict: predict && { ...predict, step: 0 },
  };
}
