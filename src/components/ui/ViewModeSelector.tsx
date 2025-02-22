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
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-[var(--background-primary)] rounded-md border border-gray-200 dark:border-gray-800 p-1">
      <button
        onClick={() => handleViewChange("grid")}
        className={`p-1.5 rounded-sm transition-colors ${
          currentView === "grid"
            ? "bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        }`}
        title="Grid View"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleViewChange("list")}
        className={`p-1.5 rounded-sm transition-colors ${
          currentView === "list"
            ? "bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        }`}
        title="List View"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
