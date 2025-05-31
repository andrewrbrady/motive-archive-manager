import { APIClient } from "@/lib/api-client";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

/**
 * Nuclear Authentication useAPI Hook
 *
 * This hook provides access to the authenticated APIClient singleton.
 * It ensures that:
 * - Only authenticated users can access the API client
 * - All API calls are automatically authenticated
 * - Components handle loading states properly
 * - No API calls can be made without authentication
 *
 * Usage:
 * ```typescript
 * const api = useAPI();
 * if (!api) return <div>Loading...</div>; // User not authenticated yet
 *
 * const data = await api.get('/users');
 * ```
 */

export function useAPI() {
  const { isAuthenticated, hasValidToken, loading } = useFirebaseAuth();

  // Only return API client when user is properly authenticated
  if (loading || !isAuthenticated || !hasValidToken) {
    return null; // Forces components to handle loading/auth states
  }

  // Return the singleton API client - it handles authentication automatically
  return APIClient.getInstance();
}

/**
 * Hook to check if API is ready to use
 * Useful for conditional rendering and loading states
 */
export function useAPIStatus() {
  const { isAuthenticated, hasValidToken, loading, error } = useFirebaseAuth();

  return {
    isReady: !loading && isAuthenticated && hasValidToken,
    isLoading: loading,
    isAuthenticated,
    hasValidToken,
    error,
  };
}
