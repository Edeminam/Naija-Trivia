import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const satoshi = localFont({
  src: [
    { path: "../fonts/Satoshi-Bold.ttf", weight: "700" },
    { path: "../fonts/Satoshi-Black.ttf", weight: "900" },
  ],
  variable: "--font-satoshi",
});

export const metadata: Metadata = {
  title: "Naija Trivia Clash · Admin",
  description: "Question CMS and moderation",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${satoshi.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
