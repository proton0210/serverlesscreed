import type { Metadata } from "next";
import { CourseShell } from "@/components/learn/course-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://serverlesscreed.com"),
  title: "Learn Amazon S3 — Free Interactive Tutorials",
  description:
    "Learn Amazon S3 through 12 Pokémon-themed quests: buckets, uploads, listing, storage classes, versioning, presigned URLs, multipart, lifecycle, security and events. No signup, AWS account or credentials needed.",
  alternates: { canonical: "/s3" },
};

export default function S3Layout({ children }: { children: React.ReactNode }) {
  return <CourseShell courseId="s3">{children}</CourseShell>;
}
