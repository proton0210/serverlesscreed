import { Open_Sans } from "next/font/google";

const wordmarkFont = Open_Sans({ subsets: ["latin"], weight: "600", display: "swap" });

/** The Serverless Creed λ mark (traced from public/logo.jpeg). Inherits the text colour. */
export function LambdaMark({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="400 345 800 585" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path
        fill="currentColor"
        d="M487 350H565C620 350 655 375 678 410L888 800C900 825 920 835 945 835H976V925H895C840 925 810 905 795 880L683 675L536 920H407L621 560L572 470C560 450 545 440 515 440H487Z"
      />
      <path fill="currentColor" d="M808 350H906L1193 925H1096Z" />
    </svg>
  );
}

/** Mark + "SERVER\ESS CREED" wordmark. Wrap in a link with aria-label="Serverless Creed home". */
export function Logo({ className = "", markClassName = "h-7 w-auto", wordmarkClassName = "text-[17px]", showWordmark = true }: { className?: string; markClassName?: string; wordmarkClassName?: string; showWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LambdaMark className={markClassName} />
      {showWordmark && (
        <span aria-hidden className={`${wordmarkFont.className} whitespace-nowrap font-semibold tracking-[.02em] ${wordmarkClassName}`}>
          SERVER\ESS CREED
        </span>
      )}
      <span className="sr-only">Serverless Creed</span>
    </span>
  );
}
