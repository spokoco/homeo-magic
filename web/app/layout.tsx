import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remedy Rx | Homeopathic Repertorization",
  description:
    "Find matching homeopathic remedies by selecting rubrics. 74,000+ rubrics, 2,400+ remedies.",
  icons: {
    icon: "/remedy-logo-green-01.svg",
    shortcut: "/remedy-logo-green-01.svg",
    apple: "/remedy-logo-green-01.svg",
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
