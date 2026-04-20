import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatGPT App Tracker",
  description: "Track your ChatGPT App Store submissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full`}
    >
      <body
        className={`${geistSans.className} min-h-full flex flex-col text-[15px] leading-relaxed`}
      >
        <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="app-shell flex h-12 items-center gap-6">
            <span className="text-[13px] font-semibold tracking-tight text-foreground">
              App Tracker
            </span>
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Apps
              </Link>
              <Link
                href="/analytics"
                className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Analytics
              </Link>
            </div>
          </div>
        </nav>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
