"use client";

import { useEffect, useRef } from "react";

interface PerformanceMonitorProps {
  name: string;
  enabled?: boolean;
}

export function PerformanceMonitor({
  name,
  enabled = process.env.NODE_ENV === "development",
}: PerformanceMonitorProps) {
  const startTimeRef = useRef<number>(Date.now());
  const hasLoggedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || hasLoggedRef.current) return;

    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;

    console.log(`🚀 ${name} - Component mounted in: ${duration}ms`);
    hasLoggedRef.current = true;

    // Track critical performance metrics
    if (typeof window !== "undefined" && window.performance) {
      // Log navigation timing for page loads
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        console.log(`📊 ${name} - Page Performance:`, {
          domContentLoaded: Math.round(
            navigation.domContentLoadedEventEnd - navigation.fetchStart
          ),
          loadComplete: Math.round(
            navigation.loadEventEnd - navigation.fetchStart
          ),
          firstPaint: Math.round(
            navigation.domContentLoadedEventStart - navigation.fetchStart
          ),
        });
      }

      // Track largest contentful paint
      if ("PerformanceObserver" in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              console.log(
                `🎯 ${name} - Largest Contentful Paint: ${Math.round(lastEntry.startTime)}ms`
              );
            }
          });
          observer.observe({ entryTypes: ["largest-contentful-paint"] });

          // Clean up observer after 10 seconds
          setTimeout(() => observer.disconnect(), 10000);
        } catch (error) {
          // Silently fail if LCP is not supported
        }
      }
    }
  }, [name, enabled]);

  return null; // This component doesn't render anything
}

// Hook for measuring specific operations
export function usePerformanceTimer(
  name: string,
  enabled = process.env.NODE_ENV === "development"
) {
  const startTime = useRef<number>(Date.now());

  const logTime = (operation: string) => {
    if (!enabled) return;
    const duration = Date.now() - startTime.current;
    console.log(`⚡ ${name} - ${operation}: ${duration}ms`);
  };

  const resetTimer = () => {
    startTime.current = Date.now();
  };

  return { logTime, resetTimer };
}
