"use client";

import React from "react";

interface EditModeToggleProps {
  isEditMode: boolean;
}

export default function EditModeToggle({ isEditMode }: EditModeToggleProps) {
  const toggleEditMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("edit", (!isEditMode).toString());
    window.history.pushState({}, "", url.toString());
    window.location.reload();
  };

  return (
    <button
      onClick={toggleEditMode}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isEditMode
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
    </button>
  );
}
