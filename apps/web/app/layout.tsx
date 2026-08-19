import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Search Readiness",
  description:
    "How ready is your website for AI Search? A deterministic, evidence-based readiness audit.",
};

// Set the stored theme before paint to avoid a flash.
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
