import { useAuthenticatedFetch } from "@/hooks/useFirebaseAuth";
import { useMemo } from "react";

// Simple fetcher for public endpoints (no auth required)
export const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || "An error occurred while fetching the data."
    );
  }
  return response.json();
};

// Authenticated fetcher utility - to be used with SWR/react-query
export const createAuthenticatedFetcher = (
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
) => {
  return async (url: string) => {
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(
        error.message || `Request failed with status ${response.status}`
      );
    }
    return response.json();
  };
};

// Hook for authenticated SWR usage
export function useAuthenticatedSWR() {
  const { authenticatedFetch } = useAuthenticatedFetch();
  const authenticatedFetcher = createAuthenticatedFetcher(authenticatedFetch);

  return { authenticatedFetch, authenticatedFetcher };
}

// Common API methods with authentication built-in
export function useAPI() {
  const { authenticatedFetch } = useAuthenticatedFetch();

  const api = useMemo(
    () => ({
      // GET with authentication
      get: async (url: string) => {
        const response = await authenticatedFetch(url);
        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: "Request failed" }));
          throw new Error(error.message || `GET ${url} failed`);
        }
        return response.json();
      },

      // POST with authentication
      post: async (url: string, data?: any) => {
        const response = await authenticatedFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: data ? JSON.stringify(data) : undefined,
        });
        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: "Request failed" }));
          throw new Error(error.message || `POST ${url} failed`);
        }
        return response.json();
      },

      // PUT with authentication
      put: async (url: string, data?: any) => {
        const response = await authenticatedFetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: data ? JSON.stringify(data) : undefined,
        });
        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: "Request failed" }));
          throw new Error(error.message || `PUT ${url} failed`);
        }
        return response.json();
      },

      // DELETE with authentication
      delete: async (url: string) => {
        const response = await authenticatedFetch(url, {
          method: "DELETE",
        });
        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: "Request failed" }));
          throw new Error(error.message || `DELETE ${url} failed`);
        }
        return response.json();
      },
    }),
    [authenticatedFetch]
  );

  return api;
}
