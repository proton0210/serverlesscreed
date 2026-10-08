"use client";

import { useSyncExternalStore } from "react";

/** Languages a course can show code in. The reader's choice is shared by every snippet and editor. */
export type CodeLanguage = "typescript" | "python";

const KEY = "serverlesscreed:code-language";
const listeners = new Set<() => void>();
let current: CodeLanguage | null = null;

function load(): CodeLanguage {
  if (current === null) {
    try {
      current = window.localStorage.getItem(KEY) === "python" ? "python" : "typescript";
    } catch {
      current = "typescript"; // storage can be blocked; the choice then lasts for this page view
    }
  }
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function setCodeLanguage(language: CodeLanguage) {
  current = language;
  try {
    window.localStorage.setItem(KEY, language);
  } catch {
    /* Storage can be unavailable (private mode, blocked site data); the choice stays in memory. */
  }
  listeners.forEach((l) => l());
}

export function useCodeLanguage(): [CodeLanguage, (language: CodeLanguage) => void] {
  const language = useSyncExternalStore(subscribe, load, () => "typescript" as CodeLanguage);
  return [language, setCodeLanguage];
}

export const LANGUAGE_LABEL: Record<CodeLanguage, string> = { typescript: "TypeScript", python: "Python" };

/** TypeScript / Python switch used above snippets and in the editor. */
export const CODE_LANGUAGES: CodeLanguage[] = ["typescript", "python"];
