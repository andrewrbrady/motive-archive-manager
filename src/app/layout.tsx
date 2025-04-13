import "./globals.css";
import { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Motive Archive",
  description: "The Collector's Resource for Premium Automobiles",
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
      <body
        className={`min-h-screen bg-background antialiased ${inter.className}`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
