import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homeo-Magic | Homeopathic Repertorization",
  description: "Find matching homeopathic remedies by selecting symptoms. Repertorization tool with 74,000+ symptoms and 2,400+ remedies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
