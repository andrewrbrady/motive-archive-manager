"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="flex items-center gap-1 bg-[hsl(var(--secondary))] rounded-md p-1">
      <button
        onClick={() => handleViewChange("grid")}
        className={cn(
          "p-1.5 rounded-sm transition-colors",
          currentView === "grid"
            ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))/10] hover:text-[hsl(var(--foreground))]"
        )}
        title="Grid View"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleViewChange("list")}
        className={cn(
          "p-1.5 rounded-sm transition-colors",
          currentView === "list"
            ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))/10] hover:text-[hsl(var(--foreground))]"
        )}
        title="List View"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
