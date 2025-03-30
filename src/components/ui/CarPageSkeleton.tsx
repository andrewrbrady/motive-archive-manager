import React from "react";

// Common classes for skeleton loading elements
const skeletonBaseClasses =
  "bg-background-secondary/70 dark:bg-background-secondary/50 rounded";

export function CarPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title skeleton - already rendered in parent component */}

      {/* Tab bar skeleton */}
      <div className="border-b border-border mb-6">
        <div className="flex space-x-4 pb-4 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-32 h-10 ${skeletonBaseClasses} animate-pulse flex-shrink-0`}
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Content skeleton - Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-md ${skeletonBaseClasses} animate-pulse`}
            style={{ animationDelay: `${i * 30}ms` }}
          />
        ))}
      </div>

      {/* Filter controls skeleton */}
      <div className="flex flex-wrap gap-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-9 w-24 ${skeletonBaseClasses} animate-pulse`}
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
