"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

interface ViewModeSelectorProps {
  currentView: string;
}

export function ViewModeSelector({ currentView }: ViewModeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleViewChange = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
      <button
        onClick={() => handleViewChange("grid")}
        className={`p-2 rounded ${
          currentView === "grid"
            ? "bg-gray-100 text-gray-900"
            : "text-gray-500 hover:text-gray-900"
        }`}
        aria-label="Grid view"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleViewChange("list")}
        className={`p-2 rounded ${
          currentView === "list"
            ? "bg-gray-100 text-gray-900"
            : "text-gray-500 hover:text-gray-900"
        }`}
        aria-label="List view"
      >
        <List className="w-5 h-5" />
      </button>
    </div>
  );
}
