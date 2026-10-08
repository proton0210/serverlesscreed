import { NextRequest, NextResponse } from "next/server";

interface ScanResult {
  safe: boolean;
  violations: Array<{
    line: number;
    column: number;
    message: string;
    severity: "error" | "warning";
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const violations: ScanResult["violations"] = [];
    const lines = code.split("\n");

    // Patterns to detect AWS credential leakage
    // We allow template patterns (process.env in credentials object) but block actual leakage
    const credentialPatterns = [
      {
        // Detect hardcoded AWS access keys (AKIA followed by 16 alphanumeric chars)
        pattern: /AKIA[0-9A-Z]{16}/g,
        message: "Hardcoded AWS access key ID detected",
        severity: "error" as const,
      },
      {
        // Detect potential hardcoded AWS secret keys (base64-like strings that are 40+ chars, not in process.env)
        pattern: /(?:^|[^.])\b["'][A-Za-z0-9\/+=]{40,}["']/g,
        message: "Potential hardcoded AWS secret key detected",
        severity: "error" as const,
      },
      {
        // Block console.log/error/warn/info that includes process.env credentials
        pattern: /console\.(log|error|warn|info|debug)\([^)]*(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|process\.env\.(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY))/gi,
        message: "Attempt to log credentials - security risk",
        severity: "error" as const,
      },
      {
        // Block exporting credentials
        pattern: /(?:export|module\.exports|exports\.)\s*.*(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY)/gi,
        message: "Attempt to export credentials",
        severity: "error" as const,
      },
      {
        // Block sending credentials to external APIs (fetch, axios, etc.)
        pattern: /(?:fetch|axios|request)\([^)]*(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|process\.env\.(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY))/gi,
        message: "Attempt to send credentials to external API",
        severity: "error" as const,
      },
      {
        // Block storing credentials in variables that might be logged
        pattern: /(?:const|let|var)\s+\w*\s*=\s*process\.env\.(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY)/gi,
        message: "Storing credentials in variables may lead to leakage",
        severity: "error" as const,
      },
      {
        // Block direct string assignment of credentials (not process.env)
        pattern: /(?:accessKeyId|secretAccessKey)\s*[:=]\s*["'][^"']+["']/gi,
        message: "Hardcoded credential value detected",
        severity: "error" as const,
      },
    ];

    // Scan each line
    lines.forEach((line, lineIndex) => {
      // Skip comments
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("//") || trimmedLine.startsWith("*")) {
        return;
      }

      credentialPatterns.forEach(({ pattern, message, severity }) => {
        const matches = line.matchAll(pattern);
        for (const match of Array.from(matches)) {
          const column = match.index !== undefined ? match.index + 1 : 0;
          violations.push({
            line: lineIndex + 1,
            column,
            message,
            severity,
          });
        }
      });
    });

    // Check for any error-level violations
    const hasErrors = violations.some((v) => v.severity === "error");

    const result: ScanResult = {
      safe: !hasErrors,
      violations,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error scanning code:", error);
    return NextResponse.json(
      { error: "Failed to scan code" },
      { status: 500 }
    );
  }
}

