import React from "react";

// Common classes for skeleton loading elements
const skeletonBaseClasses =
  "bg-background-secondary dark:bg-background-secondary rounded animate-pulse";

export function CarPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title with loading indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-12 h-12 rounded-full ${skeletonBaseClasses}`} />
        <div className={`w-64 h-8 ${skeletonBaseClasses}`} />
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4 pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`w-20 h-8 ${skeletonBaseClasses}`} />
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-4">
          <div className={`w-full aspect-video ${skeletonBaseClasses}`} />
          <div className={`w-full h-32 ${skeletonBaseClasses}`} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className={`w-full h-40 ${skeletonBaseClasses}`} />
          <div className={`w-full h-40 ${skeletonBaseClasses}`} />
        </div>
      </div>
    </div>
  );
}
