# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems.

Report privately through GitHub: **Security → Report a vulnerability** on this repository. You can also email **vidit@serverlesscreed.com**. Include what you found, how to reproduce it, and the impact you expect.

We aim to acknowledge reports within 3 working days and to tell you what we'll do within 10.

## What's in scope

- The checkers and simulators (`app/api/**`, `lib/*/checker.ts`, `lib/cdk/*`): anything that executes learner input, escapes the parser, or exhausts server memory or CPU.
- Certificates: forging a stamp, issuing a certificate without completing the quests, or reading or deleting someone else's certificate.
- Cross-site scripting through lesson content, certificate names or share links.

## Out of scope

- Reading quiz answers or reference solutions in this repository. They're public by design.
- Rate-limit tuning and denial of service by volume.
- The Tables and Buckets desktop apps. They live in separate repositories; report those to vidit@serverlesscreed.com.

## Secrets

This repository should never contain credentials. If you spot something that looks like a real key, report it as above rather than in an issue.
