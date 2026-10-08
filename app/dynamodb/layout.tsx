import type { Metadata } from "next";
import { CourseShell } from "@/components/learn/course-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://serverlesscreed.com"),
  title: "Learn DynamoDB — Free Interactive Tutorials",
  description: "Learn Amazon DynamoDB through 17 Pokémon-themed tutorials, coding exercises, and quizzes. No signup, AWS account, or credentials needed.",
  alternates: { canonical: "/dynamodb" },
};

export default function DynamoDBLayout({ children }: { children: React.ReactNode }) {
  return <CourseShell courseId="dynamodb">{children}</CourseShell>;
}
