"use client";

import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <div className="flex flex-row items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
          <p className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase tracking-wider">
            Loading Cars...
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
