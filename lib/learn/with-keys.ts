import { cloneElement, isValidElement, type ReactElement } from "react";

/**
 * Lesson content keeps JSX in plain arrays (paragraphs, bullets, quiz options, table rows).
 * React needs a key on every element in an array it renders or sends from the server,
 * so this walks the content once at module load and gives unkeyed elements a stable key.
 */
export function withKeys<T>(value: T, path = "k"): T {
  if (Array.isArray(value)) {
    return value.map((item, i) => {
      const key = `${path}-${i}`;
      if (isValidElement(item)) return item.key == null ? cloneElement(item as ReactElement, { key }) : item;
      return withKeys(item as unknown, key);
    }) as unknown as T;
  }
  if (value && typeof value === "object" && !isValidElement(value) && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Elements held in props (like a section's visual) can end up rendered as list siblings, so key them too.
      out[k] = isValidElement(v) && v.key == null ? cloneElement(v as ReactElement, { key: `${path}-${k}` }) : withKeys(v, `${path}-${k}`);
    }
    return out as T;
  }
  return value;
}
