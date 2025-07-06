import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api-client";
import { StylesheetResponse } from "@/types/stylesheet";
import { CSSClass, ParsedCSS } from "@/lib/css-parser";

interface StylesheetData {
  id: string;
  name: string;
  cssContent: string;
  parsedCSS: ParsedCSS;
  classes: CSSClass[];
}

interface UseStylesheetDataReturn {
  stylesheetData: StylesheetData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// CSS HOT-RELOAD OPTIMIZATION: Enhanced cache invalidation mechanism
let stylesheetUpdateCounter = 0;
const stylesheetUpdateListeners = new Set<() => void>();

// HOT-RELOAD: Track CSS content changes separately from full cache invalidation
const cssContentCache = new Map<string, string>();
const cssContentListeners = new Map<
  string,
  Set<(cssContent: string) => void>
>();

/**
 * CSS HOT-RELOAD: Register listener for CSS content changes on a specific stylesheet
 * This allows components to receive CSS updates without full cache invalidation
 */
export function onCSSContentChange(
  stylesheetId: string,
  listener: (cssContent: string) => void
): () => void {
  if (!cssContentListeners.has(stylesheetId)) {
    cssContentListeners.set(stylesheetId, new Set());
  }

  cssContentListeners.get(stylesheetId)!.add(listener);

  // Return cleanup function
  return () => {
    const listeners = cssContentListeners.get(stylesheetId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        cssContentListeners.delete(stylesheetId);
      }
    }
  };
}

/**
 * CSS HOT-RELOAD: Notify CSS content change without full cache invalidation
 * This allows selective CSS updates that preserve component state
 */
export function notifyCSSContentChange(
  stylesheetId: string,
  cssContent: string
) {
  // Update CSS content cache
  cssContentCache.set(stylesheetId, cssContent);

  // Notify specific listeners for this stylesheet
  const listeners = cssContentListeners.get(stylesheetId);
  if (listeners) {
    console.log(
      `⚡ CSS Hot-Reload: Notifying ${listeners.size} listeners for stylesheet ${stylesheetId}`
    );
    listeners.forEach((listener) => {
      try {
        listener(cssContent);
      } catch (error) {
        console.error("Error in CSS content change listener:", error);
      }
    });
  }
}

/**
 * Trigger a global stylesheet cache invalidation
 * Call this when stylesheets are updated, created, or deleted
 * HOT-RELOAD: This should only be used for structural changes, not CSS content updates
 */
export function invalidateStylesheetCache() {
  stylesheetUpdateCounter++;
  console.log(
    `🔄 Invalidating stylesheet cache (counter: ${stylesheetUpdateCounter})`
  );

  // Notify all active useStylesheetData hooks
  stylesheetUpdateListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Error in stylesheet update listener:", error);
    }
  });
}

/**
 * Custom hook to manage stylesheet data loading and provide reactive stylesheet information
 *
 * HOT-RELOAD OPTIMIZATION:
 * - Separates CSS content updates from full cache invalidation
 * - Uses CSS content listeners for hot-reload without re-rendering
 * - Maintains component state during CSS updates
 * - Provides incremental updates for better performance
 */
export function useStylesheetData(
  selectedStylesheetId: string | null
): UseStylesheetDataReturn {
  const [stylesheetData, setStylesheetData] = useState<StylesheetData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateCounter, setLastUpdateCounter] = useState(
    stylesheetUpdateCounter
  );

  // HOT-RELOAD: Track CSS content separately for hot updates
  const [cssContent, setCSSContent] = useState<string>("");
  const lastCSSContentRef = useRef<string>("");

  const fetchStylesheetData = async (stylesheetId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<StylesheetResponse>(
        `/stylesheets/${stylesheetId}`
      );

      const stylesheet = response.stylesheet;

      if (!stylesheet) {
        throw new Error("Stylesheet not found");
      }

      const data: StylesheetData = {
        id: stylesheet.id,
        name: stylesheet.name,
        cssContent: stylesheet.cssContent || "",
        parsedCSS: stylesheet.parsedCSS,
        classes: stylesheet.parsedCSS.classes || [],
      };

      setStylesheetData(data);
      setCSSContent(data.cssContent);
      lastCSSContentRef.current = data.cssContent;

      // HOT-RELOAD: Update CSS content cache
      cssContentCache.set(stylesheetId, data.cssContent);

      setLastUpdateCounter(stylesheetUpdateCounter);
    } catch (err) {
      console.error(
        `💥 Failed to load stylesheet data for ${stylesheetId}:`,
        err
      );
      console.error("💥 Error details:", {
        message: err instanceof Error ? err.message : "Unknown error",
        status: (err as any).status,
        code: (err as any).code,
        originalError: (err as any).originalError,
      });
      setError(
        err instanceof Error ? err.message : "Failed to load stylesheet"
      );
      setStylesheetData(null);
      setCSSContent("");
      lastCSSContentRef.current = "";
    } finally {
      setLoading(false);
    }
  };

  // HOT-RELOAD: Listen for CSS content changes on the selected stylesheet
  useEffect(() => {
    if (!selectedStylesheetId) return;

    const unsubscribe = onCSSContentChange(
      selectedStylesheetId,
      (newCSSContent) => {
        // Only update if CSS content actually changed
        if (lastCSSContentRef.current !== newCSSContent) {
          console.log(
            `⚡ CSS Hot-Reload: Updating CSS content for ${selectedStylesheetId}`
          );

          setCSSContent(newCSSContent);
          lastCSSContentRef.current = newCSSContent;

          // Update stylesheet data with new CSS content while preserving other properties
          setStylesheetData((prevData) => {
            if (!prevData) return prevData;

            return {
              ...prevData,
              cssContent: newCSSContent,
            };
          });
        }
      }
    );

    return unsubscribe;
  }, [selectedStylesheetId]);

  // Register listener for global cache invalidation (for structural changes)
  useEffect(() => {
    const listener = () => {
      if (selectedStylesheetId && stylesheetUpdateCounter > lastUpdateCounter) {
        console.log(
          `📊 Refetching stylesheet data due to cache invalidation: ${selectedStylesheetId}`
        );
        fetchStylesheetData(selectedStylesheetId);
      }
    };

    stylesheetUpdateListeners.add(listener);
    return () => {
      stylesheetUpdateListeners.delete(listener);
    };
  }, [selectedStylesheetId, lastUpdateCounter]);

  useEffect(() => {
    if (selectedStylesheetId) {
      fetchStylesheetData(selectedStylesheetId);
    } else {
      setStylesheetData(null);
      setCSSContent("");
      lastCSSContentRef.current = "";
      setError(null);
    }
  }, [selectedStylesheetId]);

  const refetch = () => {
    if (selectedStylesheetId) {
      fetchStylesheetData(selectedStylesheetId);
    }
  };

  return {
    stylesheetData,
    loading,
    error,
    refetch,
  };
}

/**
 * Helper function to get CSS class data by name from stylesheet data
 */
export function getCSSClassFromStylesheet(
  stylesheetData: StylesheetData | null,
  className: string | undefined
): CSSClass | null {
  if (!stylesheetData || !className) return null;

  return stylesheetData.classes.find((cls) => cls.name === className) || null;
}
