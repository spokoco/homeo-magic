import type { Metadata } from "next";
import { Unica_One } from "next/font/google";
import "./globals.css";

const unicaOne = Unica_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Homeo-Magic | Homeopathic Repertorization",
  description:
    "Find matching homeopathic remedies by selecting symptoms. 74,000+ symptoms, 2,400+ remedies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${unicaOne.className} antialiased`}>{children}</body>
    </html>
  );
}
