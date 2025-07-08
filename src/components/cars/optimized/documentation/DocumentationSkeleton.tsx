"use client";

import React from "react";

/**
 * DocumentationSkeleton - Loading states for Documentation tab
 * Part of Phase 1C optimization - provides smooth loading animation
 * while file list loads in critical path
 */
export function DocumentationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Upload area skeleton */}
      <div className="border-2 border-dashed rounded-lg p-6">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-4" />
        </div>
      </div>

      {/* File list skeleton */}
      <div className="border rounded-md">
        <div className="p-4 border-b">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="space-y-1">
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="flex space-x-2">
                    <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-1 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * FileListSkeleton - Specific skeleton for file list loading
 */
export function FileListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex space-x-2">
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
