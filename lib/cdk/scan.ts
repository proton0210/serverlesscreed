/** Server-side credential screen for submitted practice code (comment lines are ignored). */
const PATTERNS = [/AKIA[0-9A-Z]{16}/, /["'][A-Za-z0-9/+=]{40,}["']/, /aws_secret_access_key/i, /secret_?access_?key\s*["']?\s*[:=]\s*["'][^"']{8,}/i];

export function findCredentials(code: string): boolean {
  for (const line of code.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || t.startsWith("//")) continue;
    if (PATTERNS.some((p) => p.test(line))) return true;
  }
  return false;
}
