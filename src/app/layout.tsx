import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NavigationCacheProvider } from "@/components/providers/NavigationCacheProvider";
import { Suspense, lazy } from "react";

// ✅ Lazy load heavy components to reduce layout bundle
const Navbar = lazy(() => import("@/components/layout/navbar"));
const Footer = lazy(() => import("@/components/layout/footer"));

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Motive Archive Manager",
  description: "A modern archive management system",
};

// ✅ REMOVED force-dynamic - this was killing performance
// Only use force-dynamic on specific API routes that need it
// export const dynamic = "force-dynamic"; // ❌ REMOVED
// export const fetchCache = "default-cache"; // ❌ REMOVED
// export const revalidate = 0; // ❌ REMOVED
// export const runtime = "nodejs"; // ❌ REMOVED
// export const preferredRegion = "auto"; // ❌ REMOVED

// Simple loading fallback for navbar
const NavbarSkeleton = () => (
  <div className="fixed top-0 left-0 right-0 z-50 h-20 bg-[hsl(var(--background-secondary))] border-b border-[hsl(var(--border))] shadow-sm backdrop-blur-sm">
    <div className="container-fluid flex justify-between items-center h-20">
      <div className="w-12 h-12 bg-muted rounded animate-pulse"></div>
      <div className="hidden lg:flex space-x-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-4 w-16 bg-muted rounded animate-pulse"
          ></div>
        ))}
      </div>
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Simple loading fallback for footer
const FooterSkeleton = () => (
  <div className="h-16 bg-muted animate-pulse"></div>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* ✅ REMOVED: Monaco Editor script - only load when needed */}
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-background text-foreground flex flex-col"
        )}
      >
        <Providers>
          <NavigationCacheProvider>
            {/* ✅ Lazy load Navbar with skeleton fallback */}
            <Suspense fallback={<NavbarSkeleton />}>
              <Navbar />
            </Suspense>

            <main className="flex-grow pt-20">{children}</main>

            {/* ✅ Lazy load Footer with skeleton fallback */}
            <Suspense fallback={<FooterSkeleton />}>
              <Footer />
            </Suspense>

            <Toaster />
          </NavigationCacheProvider>
        </Providers>
        {/* ✅ Only load analytics in production */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
