"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

interface ViewModeSelectorProps {
  currentView: "grid" | "list";
}

export function ViewModeSelector({ currentView }: ViewModeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleViewChange = (mode: "grid" | "list") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] rounded-md border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] p-1">
      <button
        onClick={() => handleViewChange("grid")}
        className={`p-1.5 rounded-sm transition-colors ${
          currentView === "grid"
            ? "bg-[hsl(var(--background))] dark:bg-black text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
            : "text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:hover:text-[hsl(var(--foreground-subtle))]"
        }`}
        title="Grid View"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleViewChange("list")}
        className={`p-1.5 rounded-sm transition-colors ${
          currentView === "list"
            ? "bg-[hsl(var(--background))] dark:bg-black text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
            : "text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:hover:text-[hsl(var(--foreground-subtle))]"
        }`}
        title="List View"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
