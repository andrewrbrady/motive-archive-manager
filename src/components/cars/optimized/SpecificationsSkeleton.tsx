import React from "react";

export function SpecificationsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>

      {/* Two-column layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column skeleton */}
        <div className="space-y-6">
          {/* Basic info section */}
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3"></div>
            <div className="space-y-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing section skeleton */}
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column skeleton */}
        <div className="space-y-6">
          {/* Multiple sections */}
          {Array.from({ length: 4 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description section skeleton */}
      <div className="space-y-3">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        <div className="h-20 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
