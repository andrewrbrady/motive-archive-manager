"use client";

import React from "react";

interface ViewModeSelectorProps {
  viewMode: "grid" | "list";
}

export default function ViewModeSelector({ viewMode }: ViewModeSelectorProps) {
  const handleViewModeChange = (mode: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", mode);
    window.history.pushState({}, "", url);
    // Optionally force a refresh to reflect the new view
    window.location.reload();
  };

  return (
    <select
      className="form-select rounded-md border-[hsl(var(--border-primary))]"
      value={viewMode}
      onChange={(e) => handleViewModeChange(e.target.value)}
    >
      <option value="grid">Grid View</option>
      <option value="list">List View</option>
    </select>
  );
}
