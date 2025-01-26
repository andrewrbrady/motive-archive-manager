"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Squares2X2Icon, ListBulletIcon } from "@heroicons/react/24/outline";

interface ViewToggleProps {
  currentView: string;
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  function getViewUrl(view: string) {
    params.set("view", view);
    return `?${params.toString()}`;
  }

  return (
    <div className="flex items-center space-x-2">
      <Link
        href={getViewUrl("grid")}
        className={`p-2 rounded-md ${
          currentView === "grid"
            ? "bg-gray-100 text-gray-900"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        <Squares2X2Icon className="h-5 w-5" />
      </Link>
      <Link
        href={getViewUrl("list")}
        className={`p-2 rounded-md ${
          currentView === "list"
            ? "bg-gray-100 text-gray-900"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        <ListBulletIcon className="h-5 w-5" />
      </Link>
    </div>
  );
}
