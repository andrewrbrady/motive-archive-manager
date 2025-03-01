import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
  const getParam = (key: string) => searchParams.get(key);

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
    const params = new URLSearchParams(searchParams.toString());

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

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Use the correct App Router navigation method
    const url = `${pathname}?${params.toString()}`;

    // Log the URL update for debugging
    console.log("useUrlParams: Updating URL to", url);

    // Use replace instead of push to avoid adding to browser history
    // This helps prevent navigation issues
    router.replace(url);
  };

  return { getParam, updateParams };
}
