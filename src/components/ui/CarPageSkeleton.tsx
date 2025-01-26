import React from "react";
import Navbar from "@/components/layout/navbar";

export function CarPageSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Title */}
        <div className="mb-6">
          <div className="w-64 h-8 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded animate-pulse" />
        </div>

        {/* Image Gallery */}
        <div className="flex gap-6">
          {/* Left Column - Main Image & Metadata */}
          <div className="w-2/3 space-y-3">
            {/* Main Image */}
            <div className="sticky top-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                <div className="w-full h-full bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white dark:bg-[#111111] border border-[#eaeaea] dark:border-[#222222] rounded-lg shadow-sm p-3">
              <div className="grid grid-cols-4 divide-x divide-[#eaeaea] dark:divide-[#222222]">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center px-4 first:pl-0 last:pr-0"
                  >
                    <div className="w-24 h-4 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Thumbnails */}
          <div className="w-1/3">
            <div className="grid grid-cols-3 gap-2">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="relative aspect-[4/3]">
                  <div className="w-full h-full bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="mt-8 divide-y divide-[#eaeaea] dark:divide-[#222222] bg-white dark:bg-[#111111] border border-[#eaeaea] dark:border-[#222222] rounded-lg overflow-hidden">
          {/* Vehicle Name */}
          <div className="flex flex-col divide-y divide-[#eaeaea] dark:divide-[#222222]">
            <div className="p-2 bg-[#fafafa] dark:bg-black">
              <div className="w-16 h-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded animate-pulse" />
            </div>
            <div className="p-2">
              <div className="w-48 h-4 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded animate-pulse" />
            </div>
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-3 divide-x divide-[#eaeaea] dark:divide-[#222222]">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col divide-y divide-[#eaeaea] dark:divide-[#222222]"
              >
                <div className="p-2 bg-[#fafafa] dark:bg-black">
                  <div className="w-16 h-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded animate-pulse" />
                </div>
                <div className="p-2">
                  <div className="w-24 h-4 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Additional Specs */}
          <div className="grid grid-cols-3 divide-x divide-[#eaeaea] dark:divide-[#222222]">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col divide-y divide-[#eaeaea] dark:divide-[#222222]"
              >
                <div className="p-2 bg-[#fafafa] dark:bg-black">
                  <div className="w-16 h-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded animate-pulse" />
                </div>
                <div className="p-2">
                  <div className="w-24 h-4 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
