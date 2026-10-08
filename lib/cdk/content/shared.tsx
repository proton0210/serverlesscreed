import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import type { QuestContent } from "@/lib/learn/types";

/** Section heading with an icon. */
export const h = (Icon: IconType, label: string): ReactNode => (
  <span className="inline-flex items-center gap-2">
    <Icon aria-hidden className="h-5 w-5" />
    <span>{label}</span>
  </span>
);

type Snippet = NonNullable<QuestContent["sections"][number]["codeSnippets"]>[number];

/** One snippet in both languages. The reader's saved language picks the tab. */
export const dual = (label: string, ts: string, py: string): Snippet => ({
  language: "typescript",
  label,
  code: ts,
  variants: [
    { language: "typescript", code: ts },
    { language: "python", code: py },
  ],
});

/** A snippet that is the same in every language (CLI commands, YAML, CloudFormation JSON). */
export const plain = (language: string, label: string, code: string): Snippet => ({ language, label, code });

export type RawContent = Record<string, QuestContent>;
