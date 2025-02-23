"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-row items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
        <p className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
          LOADING CARS...
        </p>
      </div>
    </div>
  );
}
