import { useAPIQuery } from "@/hooks/useAPIQuery";
import { MediaType } from "@/types/deliverable";

interface MediaTypesResponse {
  mediaTypes: MediaType[];
  count: number;
}

/**
 * Hook for fetching media types from the API with caching
 *
 * Follows the established pattern from useAPI and useAPIQuery hooks.
 * Provides sorted, active media types for use in dropdowns and UI components.
 *
 * @returns Object containing media types, loading state, and error state
 */
export function useMediaTypes() {
  const {
    data: mediaTypesResponse,
    isLoading,
    error,
    refetch,
  } = useAPIQuery<MediaTypesResponse>("media-types", {
    staleTime: 5 * 60 * 1000, // 5 minutes cache - media types are relatively static but may change
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    select: (data: any) => {
      // Handle API response structure
      if (data && Array.isArray(data.mediaTypes)) {
        return data;
      }
      // Fallback for unexpected response format
      return { mediaTypes: [], count: 0 };
    },
  });

  // Extract media types array from response, fallback to empty array
  const mediaTypes = mediaTypesResponse?.mediaTypes || [];

  return {
    mediaTypes,
    isLoading,
    error,
    refetch,
    count: mediaTypesResponse?.count || 0,
  };
}

/**
 * Hook for getting a specific media type by ID
 *
 * @param mediaTypeId - The ObjectId or string ID of the media type to find
 * @returns The MediaType object if found, null otherwise
 */
export function useMediaType(mediaTypeId: string | null) {
  const { mediaTypes, isLoading, error } = useMediaTypes();

  const mediaType = mediaTypeId
    ? mediaTypes.find((mt) => mt._id.toString() === mediaTypeId.toString()) ||
      null
    : null;

  return {
    mediaType,
    isLoading,
    error,
  };
}
