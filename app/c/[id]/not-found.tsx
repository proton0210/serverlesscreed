import Link from "next/link";

export default function CertificateNotFound() {
  return (
    <main className="sc-app grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--sc-ink-3)]">Certificate not found</p>
        <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-.02em] text-[var(--sc-ink)]">We can&apos;t verify this certificate</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--sc-ink-3)]">
          The link may be mistyped, or its owner removed the certificate. Certificate IDs look like <span className="font-mono">SC-7K4Q-92MX</span>.
        </p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-[var(--sc-ink)] px-6 text-sm font-semibold text-white">
          Explore the courses
        </Link>
      </div>
    </main>
  );
}
