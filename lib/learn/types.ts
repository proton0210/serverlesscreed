import type { ReactNode } from "react";

/** A lesson in any course. `region` names one of the course's parts (e.g. "Kanto", "Hoenn"). */
export type QuestMeta = {
  slug: string;
  title: string;
  subtitle: string;
  accentColor: string;
  accentForegroundColor: string;
  topics: string[];
  status: "available" | "coming-soon";
  region: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
};

export type QuestSection = {
  title: ReactNode;
  /** Plain-text title for the lesson outline; filled in on the server from `title`. */
  label?: string;
  paragraphs?: ReactNode[];
  callout?: ReactNode;
  bullets?: ReactNode[];
  table?: {
    headers: ReactNode[];
    rows: ReactNode[][];
    caption?: ReactNode;
  };
  postTableParagraphs?: ReactNode[];
  codeSnippets?: {
    language: string;
    code: string;
    label?: string;
    /** The same snippet in several languages; the reader's saved language picks the tab (components/learn/lesson/code-language.ts). */
    variants?: { language: string; code: string }[];
  }[];
  /** Interactive scene shown at the end of the section. */
  visual?: ReactNode;
};

export type QuestContent = {
  intro: ReactNode;
  keyTakeaways: ReactNode[];
  sections: QuestSection[];
  quiz: {
    prompt: ReactNode;
    options: ReactNode[];
    /** Why the right option is right, shown after a correct answer. */
    answer: ReactNode;
    /** Right option, graded in the browser. Omit when the course grades on the server (see CourseConfig.certificates). */
    answerIndex?: number;
  };
};

export type Region = {
  part: string;
  title: string;
  blurb: string;
  badge: string;
  /** CSS colour for bars and glows, usually a --sc-* token. */
  color: string;
  /** Darker text colour for the region label. */
  ink: string;
};

export type CourseId = "dynamodb" | "s3" | "cdk";

/** Everything the shared learning engine needs to know about one course. */
export type CourseConfig = {
  id: CourseId;
  /** "Learn DynamoDB" — header and footer. */
  name: string;
  /** "Amazon DynamoDB" — share text. */
  service: string;
  /** Route prefix, e.g. "/dynamodb". */
  basePath: string;
  /** localStorage key for this course's progress. */
  storageKey: string;
  regions: Record<string, Region>;
  /** Region names in teaching order. */
  regionOrder: string[];
  quests: QuestMeta[];
  /** Data Critter type hosting each quest (components/dynamodb/scene/critter-svg.tsx). */
  guides: Record<string, string>;
  /** Badge id stored when a quest is completed. */
  badgeId: (slug: string, hasChallenge: boolean) => string;
  /** Verifiable certificates (lib/certificates). Checks are then graded on the server at this endpoint. */
  certificates?: { checkAnswerEndpoint: string };
  home: {
    headline: [string, string];
    lede: string;
    howItWorks: { title: string; body: string }[];
    whyOrder: string;
    whyGuide: string;
    footer: string;
  };
};
