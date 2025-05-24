"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
// import Navbar from "@/components/layout/navbar";
// import Footer from "@/components/layout/footer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* <Navbar /> */}
      <div className="container-wide px-6 py-8">
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
          <div className="flex flex-row items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
            <p className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase tracking-wider">
              Loading Cars...
            </p>
          </div>
        </div>
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
}
