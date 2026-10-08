import { nodeText } from "@/components/learn/lesson/node-text";
import { withKeys } from "@/lib/learn/with-keys";
import type { QuestContent } from "@/lib/learn/types";
import { part1 } from "./content/part1";
import { part2 } from "./content/part2";
import { part3 } from "./content/part3";

const raw: Record<string, QuestContent> = { ...part1, ...part2, ...part3 };

/** Section labels are computed on the server, while titles are still plain elements. */
const labelled = Object.fromEntries(
  Object.entries(raw).map(([slug, c]) => [slug, { ...c, sections: c.sections.map((s) => ({ ...s, label: s.label ?? nodeText(s.title).trim() })) }])
) as Record<string, QuestContent>;

export const cdkQuestContent = withKeys(labelled);
