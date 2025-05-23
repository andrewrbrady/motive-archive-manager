"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface PerformanceMetric {
  timestamp: number;
  action: string;
  duration?: number;
  path: string;
  tab?: string;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  onMetric?: (metric: PerformanceMetric) => void;
}

export function PerformanceMonitor({
  enabled = process.env.NODE_ENV === "development",
  onMetric,
}: PerformanceMonitorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const lastTabChange = useRef<number>(0);
  const isMonitoringRef = useRef(false);

  // Track tab changes
  useEffect(() => {
    if (!enabled) return;

    const currentTab = searchParams?.get("tab");
    const now = performance.now();

    if (currentTab && lastTabChange.current > 0) {
      const duration = now - lastTabChange.current;
      const metric: PerformanceMetric = {
        timestamp: now,
        action: "tab_change",
        duration,
        path: pathname || "",
        tab: currentTab,
      };

      setMetrics((prev) => [...prev.slice(-9), metric]); // Keep last 10 metrics
      onMetric?.(metric);

      // Only log warnings for truly slow tab changes (increased threshold)
      if (duration > 1000) {
        console.warn(
          `🐌 Slow tab change detected: ${duration.toFixed(2)}ms to ${currentTab}`
        );
      } else if (duration > 500) {
        console.info(
          `⚠️ Moderate tab change time: ${duration.toFixed(2)}ms to ${currentTab}`
        );
      }
    }

    lastTabChange.current = now;
  }, [searchParams, pathname, enabled, onMetric]);

  // Monitor click events on tab triggers
  useEffect(() => {
    if (!enabled || isMonitoringRef.current) return;

    const handleTabClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const isTabTrigger = target.closest("[data-radix-collection-item]");

      if (isTabTrigger) {
        const clickTime = performance.now();
        const metric: PerformanceMetric = {
          timestamp: clickTime,
          action: "tab_click",
          path: pathname || "",
        };

        setMetrics((prev) => [...prev.slice(-9), metric]);
        onMetric?.(metric);
      }
    };

    document.addEventListener("click", handleTabClick, { passive: true });
    isMonitoringRef.current = true;

    return () => {
      document.removeEventListener("click", handleTabClick);
      isMonitoringRef.current = false;
    };
  }, [enabled, pathname, onMetric]);

  // Don't render anything in production or when disabled
  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-sm z-50">
      <div className="font-semibold mb-2">Performance Monitor</div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {metrics.slice(-5).map((metric, index) => (
          <div key={index} className="flex justify-between">
            <span>{metric.action}</span>
            <span>
              {metric.duration ? `${metric.duration.toFixed(0)}ms` : "click"}
              {metric.tab && ` (${metric.tab})`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for using performance monitoring
export function usePerformanceMonitor() {
  const metricsRef = useRef<PerformanceMetric[]>([]);

  const recordMetric = (metric: PerformanceMetric) => {
    metricsRef.current = [...metricsRef.current.slice(-49), metric];
  };

  const getMetrics = () => metricsRef.current;

  const getAverageTabChangeTime = () => {
    const tabChanges = metricsRef.current.filter(
      (m) => m.action === "tab_change" && m.duration
    );
    if (tabChanges.length === 0) return 0;

    const total = tabChanges.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / tabChanges.length;
  };

  return {
    recordMetric,
    getMetrics,
    getAverageTabChangeTime,
  };
}
