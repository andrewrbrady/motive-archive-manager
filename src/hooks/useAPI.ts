import { APIClient } from "@/lib/api-client";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

// Global state to track authentication readiness
let globalAuthReady = false;
let globalAuthPromise: Promise<void> | null = null;

/**
 * Nuclear Authentication useAPI Hook
 *
 * This hook provides access to the authenticated APIClient singleton.
 * It ensures that:
 * - Only authenticated users can access the API client
 * - All API calls are automatically authenticated
 * - Components handle loading states properly
 * - No API calls can be made without authentication
 * - OPTIMIZED: Returns API client as soon as Firebase auth is ready (doesn't wait for API validation)
 * - PERFORMANCE: Global auth state prevents thundering herd problem
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
  const { isAuthenticated, loading } = useFirebaseAuth();

  // PERFORMANCE OPTIMIZATION: Only wait for Firebase auth, not API validation
  // The API client handles auth failures gracefully with retries and refresh
  if (loading || !isAuthenticated) {
    return null; // Only block for Firebase auth, not API validation
  }

  // Return the singleton API client - it handles authentication automatically
  // If the token is invalid, the API client will refresh it automatically
  return APIClient.getInstance();
}

/**
 * Hook to check if API is ready to use
 * Useful for conditional rendering and loading states
 */
export function useAPIStatus() {
  const { isAuthenticated, hasValidToken, loading, error } = useFirebaseAuth();

  return {
    isReady: !loading && isAuthenticated, // Ready as soon as Firebase auth is ready
    isFullyValidated: !loading && isAuthenticated && hasValidToken, // Includes API validation
    isLoading: loading,
    isAuthenticated,
    hasValidToken,
    error,
  };
}
