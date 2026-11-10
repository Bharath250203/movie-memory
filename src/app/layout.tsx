import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk, Inter } from "next/font/google";
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Movie Memory — a little more movie magic",
  description:
    "Keep your favorite movie close. Discover a little something you didn’t know.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#171b2d] focus:px-4 focus:py-3"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
