/**
 * Minimal, vendor-neutral analytics hook. Sends to Plausible or PostHog when one
 * is installed on the page, and always dispatches a DOM event ("sc:analytics")
 * so events can be inspected or forwarded. Never sends personal data.
 */
export type AnalyticsEvent =
  | "quest_view"
  | "code_run"
  | "scene_play"
  | "scene_complete"
  | "whatif_click"
  | "quiz_answer"
  | "certificate_claim"
  | "certificate_view"
  | "certificate_share"
  | "certificate_linkedin_add"
  | "quest_complete";

type Props = Record<string, string | number | boolean | undefined>;

type AnalyticsWindow = Window & {
  plausible?: (event: string, options?: { props?: Props }) => void;
  posthog?: { capture: (event: string, props?: Props) => void };
};

/** Properties attached to every event, e.g. experiment variants. */
const globalProps: Props = {};

export function setGlobalAnalyticsProps(props: Props) {
  Object.assign(globalProps, props);
}

export function track(event: AnalyticsEvent, eventProps: Props = {}) {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  const props = { ...globalProps, ...eventProps };
  try {
    w.plausible?.(event, { props });
    w.posthog?.capture(event, props);
    window.dispatchEvent(new CustomEvent("sc:analytics", { detail: { event, props } }));
  } catch {
    // Analytics must never break the lesson.
  }
}

const attempts = new Map<string, number>();

/** 1 for the first quiz answer on this page view, 2 for the second, and so on. */
export function quizAttempt(quest: string) {
  const n = (attempts.get(quest) ?? 0) + 1;
  attempts.set(quest, n);
  return n;
}
