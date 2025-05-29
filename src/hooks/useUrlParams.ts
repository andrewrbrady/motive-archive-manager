import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cleanupUrlParameters } from "@/utils/urlCleanup";

/**
 * Custom hook for managing URL parameters with context awareness
 *
 * This hook provides utilities for getting and updating URL parameters
 * while maintaining context awareness between different sections of the app.
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Get a specific parameter from the URL
   * @param key The parameter key to retrieve
   * @returns The parameter value or null if not present
   */
  const getParam = (key: string) => searchParams?.get(key);

  /**
   * Update URL parameters with context awareness
   * @param updates Object containing parameter updates (null to remove)
   * @param options Configuration options for the update
   */
  const updateParams = (
    updates: Record<string, string | null>,
    options: {
      preserveParams?: string[]; // Parameters to always preserve
      clearOthers?: boolean; // Clear all other parameters
      context?: string; // Current context (e.g., 'tab:hard-drives')
    } = {}
  ) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    // Handle explicit parameter removal with extra care for 'template'
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Clear unrelated parameters if requested
    if (options.clearOthers) {
      // Keep only the specified parameters to preserve
      const keysToKeep = options.preserveParams || [];
      const currentKeys = Array.from(params.keys());

      currentKeys.forEach((key) => {
        if (!keysToKeep.includes(key) && !Object.keys(updates).includes(key)) {
          params.delete(key);
        }
      });
    }

    // Special case for template parameter in non-template contexts
    if (
      options.context &&
      options.context !== "tab:shot-lists" &&
      options.context !== "tab:scripts" &&
      params.has("template")
    ) {
      params.delete("template");
    }

    // Apply context-based cleanup if specified
    if (options.context) {
      const cleanedParams = cleanupUrlParameters(params, options.context);

      // Use the cleaned parameters
      const url = `${pathname}?${cleanedParams.toString()}`;

      // Use replace instead of push to avoid adding to browser history
      router.replace(url);
    } else {
      // Use the cleaned parameters
      const url = `${pathname}?${params.toString()}`;

      // Use replace instead of push to avoid adding to browser history
      router.replace(url);
    }
  };

  return { getParam, updateParams };
}
