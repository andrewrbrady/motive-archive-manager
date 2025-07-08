"use client";

import React from "react";

/**
 * PHASE 1D: INSPECTION TAB PERFORMANCE ANALYSIS & INITIAL OPTIMIZATION
 *
 * CURRENT STATE ANALYSIS (InspectionTab.tsx - 179 lines):
 * ========================================================
 *
 * Performance Issues Identified:
 * - Single API call loading ALL inspection data: `api.get(cars/${carId}/inspections)`
 * - Stats calculations performed synchronously on full dataset
 * - Heavy operations (creation, editing) loaded immediately
 * - No loading state differentiation between critical/background operations
 * - All inspection data loaded before any UI display
 *
 * Component Structure (179 lines):
 * - Lines 1-47: Imports, state, and fetchInspections function
 * - Lines 48-78: Navigation handlers (creation, editing, viewing)
 * - Lines 79-84: Stats calculations (passed/failed/total)
 * - Lines 85-179: Render with header, stats cards, and inspection list
 *
 * Critical Path Analysis:
 * - Essential: Recent inspections list (last 5-10 inspections)
 * - Background: Full inspection history, detailed stats
 * - Heavy: Creation/editing operations (separate routes)
 *
 * API Optimization Opportunities:
 * - Critical: `cars/${carId}/inspections?limit=10&sort=-inspectedAt&fields=minimal`
 * - Background: `cars/${carId}/inspections/summary` for stats
 * - Lazy: Full inspection data only when needed
 *
 * OPTIMIZATION PLAN (Target: 50-60% faster loading):
 * ===================================================
 *
 * Architecture Split (Following Proven Pattern):
 * - BaseInspections.tsx (~200 lines): Critical path display with recent inspections
 * - InspectionEditor.tsx (~180 lines): Heavy operations, lazy loaded
 * - InspectionsOptimized.tsx (~250 lines): Main coordinator with progressive loading
 * - InspectionSkeleton.tsx (80 lines): Loading states [CURRENT FILE]
 *
 * Performance Strategy:
 * - Critical Path: Recent 10 inspections with minimal fields (title, status, date, inspector)
 * - Background: Full inspection data, stats calculations, summaries
 * - Lazy Loading: Creation/editing functionality loads on-demand
 * - Bundle Splitting: Heavy operations only load when accessed
 *
 * Expected Performance Impact:
 * - Initial Load: 179 lines → 80 lines skeleton + 200 lines base = 66% reduction
 * - Memory Usage: Heavy operations lazy loaded (60% reduction)
 * - API Optimization: Minimal fields critical path (70% data reduction)
 * - Bundle Splitting: Edit functionality only loads when accessed
 *
 * Next Implementation Steps:
 * 1. Create BaseInspections.tsx with critical path API pattern
 * 2. Create InspectionEditor.tsx for heavy operations (lazy loaded)
 * 3. Create InspectionsOptimized.tsx as main coordinator
 * 4. Update CarTabs.tsx to use InspectionsOptimized with Suspense
 * 5. Test performance improvements and document results
 */

/**
 * InspectionSkeleton - Loading states for Inspection tab
 * Part of Phase 1D optimization - provides smooth loading animation
 * while inspection list loads in critical path
 */
export function InspectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-6 space-y-4">
            <div className="flex flex-row items-center justify-between space-y-0">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Inspection list skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-6 space-y-4">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>

            {/* Content section */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * InspectionListSkeleton - Specific skeleton for inspection list loading
 */
export function InspectionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-4 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
