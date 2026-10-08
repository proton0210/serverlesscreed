import type { RunOutput } from "@/components/learn/lesson/workbench";

type Violation = { line: number; column?: number; message: string; severity?: string };

/** Screens submitted code for credential-like material before any emulation. */
export async function securityScan(code: string): Promise<RunOutput | null> {
  const res = await fetch("/api/learn/scan-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("The security scan could not run. Try again.");
  const scan = (await res.json()) as { safe: boolean; violations: Violation[] };
  if (scan.safe) return null;
  return {
    ok: false,
    title: "Blocked by the security scan",
    detail:
      scan.violations.map((v) => `Line ${v.line}: ${v.message}`).join("\n") +
      "\n\nCredential-like material is never accepted. Remove it and run again.",
  };
}

export const failure = (title: string, detail?: string): RunOutput => ({ ok: false, title, detail });
export const errorOutput = (error: unknown): RunOutput => failure("Something went wrong", error instanceof Error ? error.message : "Unknown error");
