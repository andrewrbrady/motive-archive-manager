"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#111111]">
      <div className="flex flex-row items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          LOADING CARS...
        </p>
      </div>
    </div>
  );
}
