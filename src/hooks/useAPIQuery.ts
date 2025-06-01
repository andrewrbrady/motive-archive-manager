import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  MutationFunction,
} from "@tanstack/react-query";
import { useAPI, useAPIStatus } from "@/hooks/useAPI";

/**
 * Nuclear Authentication useAPIQuery Hook
 *
 * This hook provides seamless React Query integration with the authenticated APIClient.
 * It ensures that:
 * - All queries are automatically authenticated
 * - Proper loading states when user is not authenticated
 * - TypeScript support with generics
 * - Standard React Query features (caching, refetching, etc.)
 * - No queries run until user is properly authenticated
 *
 * Usage:
 * ```typescript
 * const { data, isLoading, error } = useAPIQuery('/users', {
 *   staleTime: 5 * 60 * 1000, // 5 minutes
 * });
 * ```
 */

interface UseAPIQueryOptions<T>
  extends Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> {
  queryKey?: any[]; // Allow custom query keys
}

/**
 * React Query hook for GET requests with automatic authentication
 */
export function useAPIQuery<T>(
  endpoint: string,
  options: UseAPIQueryOptions<T> = {}
) {
  const api = useAPI();
  const { isReady } = useAPIStatus();

  const { queryKey, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKey || [endpoint],
    queryFn: async () => {
      if (!api) {
        throw new Error("Authentication required");
      }
      return api.get<T>(endpoint);
    },
    enabled: isReady && options.enabled !== false, // Use optimized isReady (Firebase only)
    ...queryOptions,
  });
}

/**
 * React Query hook for POST mutations with automatic authentication
 */
export function useAPIMutation<TData = any, TVariables = any>(
  endpoint: string,
  options: UseMutationOptions<TData, Error, TVariables> = {}
) {
  const api = useAPI();
  const queryClient = useQueryClient();

  const mutationFn: MutationFunction<TData, TVariables> = async (variables) => {
    if (!api) {
      throw new Error("Authentication required");
    }
    return api.post<TData>(endpoint, variables);
  };

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      options.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * React Query hook for PUT mutations with automatic authentication
 */
export function useAPIPutMutation<TData = any, TVariables = any>(
  endpoint: string,
  options: UseMutationOptions<TData, Error, TVariables> = {}
) {
  const api = useAPI();
  const queryClient = useQueryClient();

  const mutationFn: MutationFunction<TData, TVariables> = async (variables) => {
    if (!api) {
      throw new Error("Authentication required");
    }
    return api.put<TData>(endpoint, variables);
  };

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      options.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * React Query hook for PATCH mutations with automatic authentication
 */
export function useAPIPatchMutation<TData = any, TVariables = any>(
  endpoint: string,
  options: UseMutationOptions<TData, Error, TVariables> = {}
) {
  const api = useAPI();
  const queryClient = useQueryClient();

  const mutationFn: MutationFunction<TData, TVariables> = async (variables) => {
    if (!api) {
      throw new Error("Authentication required");
    }
    return api.patch<TData>(endpoint, variables);
  };

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      options.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * React Query hook for DELETE mutations with automatic authentication
 */
export function useAPIDeleteMutation<TData = any, TVariables = any>(
  endpoint: string,
  options: UseMutationOptions<TData, Error, TVariables> = {}
) {
  const api = useAPI();
  const queryClient = useQueryClient();

  const mutationFn: MutationFunction<TData, TVariables> = async (variables) => {
    if (!api) {
      throw new Error("Authentication required");
    }
    return api.delete<TData>(endpoint);
  };

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      options.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * React Query hook for file upload mutations with automatic authentication
 */
export function useAPIUploadMutation<TData = any>(
  endpoint: string,
  options: UseMutationOptions<TData, Error, FormData> = {}
) {
  const api = useAPI();
  const queryClient = useQueryClient();

  const mutationFn: MutationFunction<TData, FormData> = async (formData) => {
    if (!api) {
      throw new Error("Authentication required");
    }
    return api.upload<TData>(endpoint, formData);
  };

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      options.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Prefetch data for later use with automatic authentication
 */
export function usePrefetchAPI() {
  const api = useAPI();
  const queryClient = useQueryClient();
  const { isReady } = useAPIStatus();

  const prefetch = async <T>(endpoint: string, staleTime?: number) => {
    if (!isReady || !api) {
      console.warn("Cannot prefetch data - user not authenticated");
      return;
    }

    await queryClient.prefetchQuery({
      queryKey: [endpoint],
      queryFn: () => api.get<T>(endpoint),
      staleTime: staleTime || 5 * 60 * 1000, // 5 minutes default
    });
  };

  return { prefetch, isReady };
}

/**
 * Helper hook to get the query client for advanced operations
 */
export function useAPIQueryClient() {
  return useQueryClient();
}

/**
 * Hook for paginated queries with automatic authentication
 */
export function useAPIPaginatedQuery<T>(
  endpoint: string,
  params: Record<string, any> = {},
  options: UseAPIQueryOptions<T> = {}
) {
  const api = useAPI();
  const { isReady } = useAPIStatus();

  const queryString = new URLSearchParams(params).toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

  return useQuery({
    queryKey: [endpoint, params],
    queryFn: async () => {
      if (!api) {
        throw new Error("Authentication required");
      }
      return api.get<T>(fullEndpoint);
    },
    enabled: isReady && options.enabled !== false,
    ...options,
  });
}
