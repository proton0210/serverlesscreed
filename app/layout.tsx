import type { Metadata } from "next";
import "./globals.css";
import { Inter as FontSans } from "next/font/google";
import { cn } from "@/utils/cn";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});
export const metadata: Metadata = {
  title: {
    default: "Serverless Creed — Buckets by ServerlessCreed & Tables by Serverless Creed",
    template: "%s | Serverless Creed",
  },
  description:
    "Serverless Creed builds Buckets by ServerlessCreed for use with Amazon S3 and Tables by Serverless Creed for use with Amazon DynamoDB.",
  icons: {
    icon: "/logo.jpeg",
    shortcut: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          html.css-loading body { visibility: hidden; }
          html.css-ready body { visibility: visible; }
        `}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.documentElement.classList.add('css-loading');
              var revealPage = function () {
                document.documentElement.classList.remove('css-loading');
                document.documentElement.classList.add('css-ready');
              };
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', revealPage, { once: true });
              } else {
                revealPage();
              }
              window.setTimeout(revealPage, 1500);
            `,
          }}
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
