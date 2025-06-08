"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useFastRouter } from "@/lib/navigation/simple-cache";
import { usePathname } from "next/navigation";

interface PerformanceMetrics {
  averageTime: number;
  maxTime: number;
  minTime: number;
  totalNavigations: number;
  slowNavigations: number;
}

interface NavigationPerformanceMonitorProps {
  enabled?: boolean;
  showInProduction?: boolean;
}

/**
 * Navigation Performance Monitor
 * Tracks and displays navigation performance metrics in development
 */
export function NavigationPerformanceMonitor({
  enabled = process.env.NODE_ENV === "development",
  showInProduction = false,
}: NavigationPerformanceMonitorProps) {
  const { getPerformanceMetrics } = useFastRouter();
  const pathname = usePathname();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [recentNavigations, setRecentNavigations] = useState<
    Array<{
      path: string;
      time: number;
      timestamp: number;
    }>
  >([]);

  // Don't render in production unless explicitly enabled
  if (!enabled && !showInProduction) {
    return null;
  }

  // Update metrics periodically - remove problematic dependency
  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = getPerformanceMetrics();
      if (currentMetrics) {
        setMetrics(currentMetrics);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, []); // ✅ Empty dependency array to prevent infinite re-renders

  // Track recent navigation
  useEffect(() => {
    const now = Date.now();
    setRecentNavigations((prev) => [
      { path: pathname || "/", time: 0, timestamp: now },
      ...prev.slice(0, 4), // Keep last 5 navigations
    ]);
  }, [pathname]);

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (!isVisible && enabled) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsVisible(true)}
        title="Click to show navigation performance (Ctrl+Shift+P)"
      >
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs">
          📊 Perf
        </div>
      </div>
    );
  }

  if (!isVisible) return null;

  const getPerformanceColor = (time: number) => {
    if (time < 200) return "text-green-400";
    if (time < 500) return "text-yellow-400";
    if (time < 1000) return "text-orange-400";
    return "text-red-400";
  };

  const getPerformanceGrade = (avgTime: number) => {
    if (avgTime < 200) return { grade: "A+", color: "text-green-400" };
    if (avgTime < 500) return { grade: "A", color: "text-green-300" };
    if (avgTime < 800) return { grade: "B", color: "text-yellow-400" };
    if (avgTime < 1200) return { grade: "C", color: "text-orange-400" };
    return { grade: "D", color: "text-red-400" };
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg shadow-xl max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">🚀 Navigation Performance</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
          title="Close (Ctrl+Shift+P)"
        >
          ×
        </button>
      </div>

      {metrics ? (
        <div className="space-y-2 text-xs">
          {/* Overall Grade */}
          <div className="flex items-center justify-between">
            <span>Overall Grade:</span>
            <span
              className={`font-bold ${getPerformanceGrade(metrics.averageTime).color}`}
            >
              {getPerformanceGrade(metrics.averageTime).grade}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-gray-400">Avg Time:</div>
              <div className={getPerformanceColor(metrics.averageTime)}>
                {metrics.averageTime.toFixed(0)}ms
              </div>
            </div>
            <div>
              <div className="text-gray-400">Max Time:</div>
              <div className={getPerformanceColor(metrics.maxTime)}>
                {metrics.maxTime.toFixed(0)}ms
              </div>
            </div>
            <div>
              <div className="text-gray-400">Total:</div>
              <div className="text-blue-300">{metrics.totalNavigations}</div>
            </div>
            <div>
              <div className="text-gray-400">Slow (&gt;1s):</div>
              <div
                className={
                  metrics.slowNavigations > 0
                    ? "text-red-400"
                    : "text-green-400"
                }
              >
                {metrics.slowNavigations}
              </div>
            </div>
          </div>

          {/* Recent Navigations */}
          <div className="border-t border-gray-600 pt-2">
            <div className="text-gray-400 mb-1">Recent:</div>
            <div className="space-y-1">
              {recentNavigations.slice(0, 3).map((nav, index) => (
                <div key={nav.timestamp} className="text-xs">
                  <span className="text-gray-400">
                    {new Date(nav.timestamp).toLocaleTimeString()} →
                  </span>
                  <span className="ml-1 text-blue-300">{nav.path}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Tips */}
          {metrics.slowNavigations > 0 && (
            <div className="border-t border-gray-600 pt-2">
              <div className="text-yellow-400 text-xs">
                💡 {metrics.slowNavigations} slow navigation(s) detected
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Check for heavy API calls or large component bundles
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-400 text-xs">
          No navigation data yet. Navigate between pages to see metrics.
        </div>
      )}

      <div className="border-t border-gray-600 pt-2 mt-2">
        <div className="text-gray-500 text-xs">
          Press Ctrl+Shift+P to toggle
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for accessing navigation performance data
 */
export function useNavigationPerformance() {
  const { getPerformanceMetrics } = useFastRouter();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Update metrics periodically - remove problematic dependency
  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = getPerformanceMetrics();
      setMetrics(currentMetrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, []); // ✅ Empty dependency array to prevent infinite re-renders

  return {
    metrics,
    isPerformanceGood: metrics ? metrics.averageTime < 500 : null,
    hasSlowNavigations: metrics ? metrics.slowNavigations > 0 : false,
  };
}
