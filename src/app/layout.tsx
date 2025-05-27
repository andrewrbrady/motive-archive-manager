import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import Script from "next/script";
import { cn } from "@/lib/utils";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Motive Archive Manager",
  description: "A modern archive management system",
};

// Configure options for Next.js prefetching behavior
export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";
export const revalidate = 0;
export const runtime = "nodejs";
export const preferredRegion = "auto";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://unpkg.com/monaco-vim/dist/monaco-vim.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-background text-foreground flex flex-col"
        )}
      >
        <Providers>
          <Navbar />
          <main className="flex-grow pt-20">{children}</main>
          <Footer />
          <Toaster />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
