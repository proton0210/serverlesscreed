import type { Metadata } from "next";
import { CourseShell } from "@/components/learn/course-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://serverlesscreed.com"),
  title: "Learn AWS CDK — Free Interactive Tutorials in TypeScript and Python",
  description:
    "Learn the AWS Cloud Development Kit through 12 Pokémon-themed quests: constructs, stacks, buckets, tables, functions, grants, tokens, APIs, environments, testing and launch review. TypeScript and Python. No signup or AWS account needed.",
  alternates: { canonical: "/cdk" },
};

export default function CdkLayout({ children }: { children: React.ReactNode }) {
  return <CourseShell courseId="cdk">{children}</CourseShell>;
}
