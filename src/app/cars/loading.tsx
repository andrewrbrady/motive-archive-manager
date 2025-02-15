"use client";

import React, { useState } from "react";
import { MotiveLogo } from "@/components/ui/MotiveLogo";

export default function Loading() {
  const [isAnimating, setIsAnimating] = useState(true);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#111111]">
      <div className="flex flex-row items-center gap-4">
        <div
          className={`transition-opacity duration-500 ${
            isAnimating ? "opacity-50" : "opacity-100"
          }`}
        >
          <MotiveLogo
            variant="animated"
            className="w-16 h-16"
            onAnimationEnd={() => setIsAnimating(false)}
          />
        </div>
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400 animate-pulse">
          LOADING...
        </p>
      </div>
    </div>
  );
}
