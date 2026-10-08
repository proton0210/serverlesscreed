import Script from "next/script";

/**
 * Loads Plausible when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set (e.g. "serverlesscreed.com").
 * Plausible is cookieless and collects no personal data, matching the course's
 * "no account required" promise. lib/analytics.ts sends custom events to it.
 */
export function AnalyticsScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
  return (
    <>
      <Script id="plausible-queue" strategy="afterInteractive">
        {"window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) };"}
      </Script>
      <Script src={src} data-domain={domain} strategy="afterInteractive" />
    </>
  );
}
