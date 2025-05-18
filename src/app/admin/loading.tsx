"use client";

import { Loader2 } from "lucide-react";
// import Navbar from "@/components/layout/navbar";
// import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col min-h-[calc(100vh-80px)]">
        <h1 className="text-3xl font-bold container mx-auto px-4 pt-8 pb-4">
          Admin Dashboard
        </h1>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-row items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
            <p className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase tracking-wider">
              Loading Admin...
            </p>
          </div>
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
}
