import { Fragment } from "react";

/** Renders plain text with `backtick` spans as inline code (exercise briefs are plain strings). */
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : <Fragment key={i}>{part}</Fragment>
      )}
    </>
  );
}
