import { useAPIQuery } from "./useAPIQuery";

// Import BrandTone type from API route
export interface BrandTone {
  _id?: string;
  name: string;
  description: string;
  tone_instructions: string;
  example_phrases: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

/**
 * Hook to fetch active brand tones for copywriter interfaces
 *
 * This hook fetches brand tones that have is_active: true from the
 * public endpoint /api/brand-tones/active. These are used in copywriter
 * UI components to allow users to select brand tones for content generation.
 *
 * Usage:
 * ```typescript
 * const { brandTones, isLoading, error } = useBrandTones();
 * ```
 */
export function useBrandTones() {
  const {
    data: brandTones,
    isLoading,
    error,
    refetch,
  } = useAPIQuery<BrandTone[]>("/api/brand-tones/active", {
    queryKey: ["brand-tones-active"], // Shared cache key
    staleTime: 5 * 60 * 1000, // 5 minutes cache - brand tones don't change frequently
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false, // Don't refetch on window focus for static data
  });

  return {
    brandTones: brandTones || [],
    isLoading,
    error,
    refetch,
  };
}
