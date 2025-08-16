/**
 * React Hook for Image Optimization - Phase 1 Implementation
 *
 * Provides easy-to-use React integration for the unified
 * image optimization system.
 */

import { useState, useCallback, useRef } from "react";
import {
  optimizeImageForUpload,
  optimizeImageBatch,
  OptimizationOptions,
  OptimizationResult,
  shouldOptimizeImage,
  getOptimizationStats,
} from "@/lib/imageOptimization";

export interface UseImageOptimizationOptions extends OptimizationOptions {
  autoOptimize?: boolean;
  trackStats?: boolean;
}

export interface OptimizationProgress {
  isOptimizing: boolean;
  currentFile: string;
  completed: number;
  total: number;
  progress: number; // 0-100
}

export interface OptimizationState {
  results: OptimizationResult[];
  progress: OptimizationProgress;
  error: string | null;
  stats: ReturnType<typeof getOptimizationStats> | null;
}

/**
 * Hook for single or batch image optimization
 */
export function useImageOptimization(
  options: UseImageOptimizationOptions = {}
) {
  const [state, setState] = useState<OptimizationState>({
    results: [],
    progress: {
      isOptimizing: false,
      currentFile: "",
      completed: 0,
      total: 0,
      progress: 0,
    },
    error: null,
    stats: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateProgress = useCallback(
    (completed: number, total: number, currentFile: string) => {
      setState((prev) => ({
        ...prev,
        progress: {
          isOptimizing: completed < total,
          currentFile,
          completed,
          total,
          progress: total > 0 ? (completed / total) * 100 : 0,
        },
      }));
    },
    []
  );

  const optimizeSingle = useCallback(
    async (
      file: File,
      customOptions?: Partial<OptimizationOptions>
    ): Promise<OptimizationResult | null> => {
      const finalOptions = { ...options, ...customOptions };

      setState((prev) => ({
        ...prev,
        error: null,
        progress: {
          isOptimizing: true,
          currentFile: file.name,
          completed: 0,
          total: 1,
          progress: 0,
        },
      }));

      try {
        // Check if optimization is needed
        if (
          !finalOptions.autoOptimize &&
          !shouldOptimizeImage(file, finalOptions)
        ) {
          const result: OptimizationResult = {
            optimizedFile: file,
            originalSize: file.size,
            optimizedSize: file.size,
            compressionRatio: 1,
            widthReduction: 1,
            heightReduction: 1,
            formatChanged: false,
            processingTime: 0,
          };

          setState((prev) => ({
            ...prev,
            results: [result],
            progress: {
              isOptimizing: false,
              currentFile: file.name,
              completed: 1,
              total: 1,
              progress: 100,
            },
            stats: options.trackStats ? getOptimizationStats([result]) : null,
          }));

          return result;
        }

        const result = await optimizeImageForUpload(file, finalOptions);

        setState((prev) => ({
          ...prev,
          results: [result],
          progress: {
            isOptimizing: false,
            currentFile: file.name,
            completed: 1,
            total: 1,
            progress: 100,
          },
          stats: options.trackStats ? getOptimizationStats([result]) : null,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Optimization failed";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          progress: {
            isOptimizing: false,
            currentFile: file.name,
            completed: 0,
            total: 1,
            progress: 0,
          },
        }));
        return null;
      }
    },
    [options]
  );

  const optimizeBatch = useCallback(
    async (
      files: File[],
      customOptions?: Partial<OptimizationOptions>
    ): Promise<OptimizationResult[]> => {
      const finalOptions = { ...options, ...customOptions };

      setState((prev) => ({
        ...prev,
        error: null,
        results: [],
        stats: null,
      }));

      // Create new abort controller for this operation
      abortControllerRef.current = new AbortController();

      try {
        const results = await optimizeImageBatch(
          files,
          finalOptions,
          updateProgress
        );

        setState((prev) => ({
          ...prev,
          results,
          stats: options.trackStats ? getOptimizationStats(results) : null,
        }));

        return results;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Batch optimization failed";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          progress: {
            isOptimizing: false,
            currentFile: "",
            completed: 0,
            total: files.length,
            progress: 0,
          },
        }));
        return [];
      }
    },
    [options, updateProgress]
  );

  const cancelOptimization = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          isOptimizing: false,
        },
      }));
    }
  }, []);

  const reset = useCallback(() => {
    cancelOptimization();
    setState({
      results: [],
      progress: {
        isOptimizing: false,
        currentFile: "",
        completed: 0,
        total: 0,
        progress: 0,
      },
      error: null,
      stats: null,
    });
  }, [cancelOptimization]);

  return {
    // State
    ...state,

    // Actions
    optimizeSingle,
    optimizeBatch,
    cancelOptimization,
    reset,

    // Helpers
    shouldOptimize: useCallback(
      (file: File) => shouldOptimizeImage(file, options),
      [options]
    ),
  };
}

/**
 * Lightweight hook for checking if files need optimization
 */
export function useOptimizationCheck(options: OptimizationOptions = {}) {
  return useCallback(
    (files: File | File[]) => {
      const fileArray = Array.isArray(files) ? files : [files];
      return {
        needsOptimization: fileArray.some((file) =>
          shouldOptimizeImage(file, options)
        ),
        totalFiles: fileArray.length,
        filesToOptimize: fileArray.filter((file) =>
          shouldOptimizeImage(file, options)
        ).length,
      };
    },
    [options]
  );
}

/**
 * Hook for optimization statistics
 */
export function useOptimizationStats() {
  const [stats, setStats] = useState<ReturnType<
    typeof getOptimizationStats
  > | null>(null);

  const updateStats = useCallback((results: OptimizationResult[]) => {
    if (results.length > 0) {
      setStats(getOptimizationStats(results));
    }
  }, []);

  const clearStats = useCallback(() => {
    setStats(null);
  }, []);

  return {
    stats,
    updateStats,
    clearStats,
    hasStats: stats !== null,
  };
}
