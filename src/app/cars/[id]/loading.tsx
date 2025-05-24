"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
// import Navbar from "@/components/layout/navbar";
// import Footer from "@/components/layout/footer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function CarDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* <Navbar /> */}
      <div className="container-wide px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-full bg-background-secondary animate-pulse" />
          <div className="h-8 w-64 bg-background-secondary animate-pulse rounded" />
        </div>

        {/* Tab bar */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex space-x-4 pb-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-20 h-8 bg-background-secondary animate-pulse rounded"
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
}
