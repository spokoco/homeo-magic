import type { Metadata } from "next";
import "./globals.css";
import { appPath, metadataBase } from "./sitePaths";

export const metadata: Metadata = {
  metadataBase,
  title: "Remedy Rx | Homeopathic Repertorization",
  description:
    "Find matching homeopathic remedies by selecting rubrics. 74,000+ rubrics, 2,400+ remedies.",
  icons: {
    icon: appPath("/remedy-logo-green-01.svg"),
    shortcut: appPath("/remedy-logo-green-01.svg"),
    apple: appPath("/remedy-logo-green-01.svg"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
