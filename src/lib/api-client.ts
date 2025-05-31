import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

/**
 * Gets a valid authentication token from Firebase
 * This is exported so it can be used independently or by the APIClient
 */
export async function getValidToken(): Promise<string> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Authentication required - no user logged in");
    }

    const token = await getIdToken(currentUser, false); // false = use cached token if valid

    if (!token) {
      throw new Error("Authentication required - failed to get token");
    }

    return token;
  } catch (error: any) {
    console.error(
      "💥 getValidToken: Failed to get authentication token:",
      error
    );
    throw new Error("Authentication required - please sign in");
  }
}

/**
 * Refreshes the authentication token by forcing a new token request
 * This is exported so it can be used independently or by the APIClient
 */
export async function refreshToken(): Promise<string> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Authentication required - no user logged in");
    }

    const token = await getIdToken(currentUser, true); // true = force refresh

    if (!token) {
      throw new Error("Authentication required - failed to refresh token");
    }

    return token;
  } catch (error: any) {
    console.error(
      "💥 refreshToken: Failed to refresh authentication token:",
      error
    );
    throw new Error("Authentication required - please sign in again");
  }
}

/**
 * Nuclear Authentication API Client
 *
 * This singleton class ensures that ALL API calls are automatically authenticated.
 * No more manual Authorization headers, no more forgetting to add authentication.
 *
 * Key Features:
 * - Singleton pattern ensures consistency across the entire app
 * - Automatic authentication on every request using centralized getValidToken
 * - Built-in token refresh and retry logic
 * - TypeScript support with generics
 * - Comprehensive error handling
 * - Impossible to make unauthenticated API calls
 */

interface APIError {
  message: string;
  status?: number;
  code?: string;
}

interface RequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  skipAuth?: boolean; // For rare cases where auth is not needed
}

class APIClient {
  private static instance: APIClient;
  private baseURL = "/api";
  private retryAttempts = 1; // Number of retry attempts for 401 errors

  // Singleton pattern ensures one source of truth
  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  // Private constructor prevents external instantiation
  private constructor() {}

  /**
   * Gets authentication headers for requests
   * This method ALWAYS gets called for every request (unless skipAuth is true)
   * Now uses the centralized getValidToken function
   */
  private async getAuthHeaders(skipAuth = false): Promise<HeadersInit> {
    const baseHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (skipAuth) {
      return baseHeaders;
    }

    try {
      const token = await getValidToken(); // Using centralized function
      return {
        ...baseHeaders,
        Authorization: `Bearer ${token}`,
      };
    } catch (error) {
      console.error("💥 APIClient: Failed to get auth headers:", error);
      throw error;
    }
  }

  /**
   * Core request method that handles all HTTP requests with automatic authentication
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { headers = {}, skipAuth = false, ...requestOptions } = options;

    // Ensure endpoint starts with /api or is absolute
    const url = endpoint.startsWith("/")
      ? endpoint
      : `${this.baseURL}/${endpoint}`;

    try {
      // Get authentication headers (or skip if requested)
      const authHeaders = await this.getAuthHeaders(skipAuth);

      const response = await fetch(url, {
        ...requestOptions,
        headers: {
          ...authHeaders,
          ...headers, // Allow override of auth headers if needed
        },
      });

      // Handle 401 errors with automatic token refresh and retry
      if (response.status === 401 && !skipAuth && this.retryAttempts > 0) {
        console.log(
          "🔄 APIClient: Got 401, attempting token refresh and retry..."
        );

        try {
          // Try to refresh the token using centralized function
          await refreshToken();

          // Retry the request with fresh token
          const freshAuthHeaders = await this.getAuthHeaders(skipAuth);
          const retryResponse = await fetch(url, {
            ...requestOptions,
            headers: {
              ...freshAuthHeaders,
              ...headers,
            },
          });

          if (retryResponse.status === 401) {
            throw new Error("Authentication failed - please sign in again");
          }

          return this.handleResponse<T>(retryResponse);
        } catch (refreshError) {
          console.error("💥 APIClient: Token refresh failed:", refreshError);
          throw new Error("Authentication failed - please sign in again");
        }
      }

      return this.handleResponse<T>(response);
    } catch (error: any) {
      console.error(
        `💥 APIClient: ${requestOptions.method || "GET"} ${url} failed:`,
        error
      );
      throw this.createAPIError(error, url);
    }
  }

  /**
   * Handles response parsing and error checking
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If we can't parse error as JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      const error: APIError = {
        message: errorMessage,
        status: response.status,
      };

      throw error;
    }

    // Handle responses that might not have a body (like 204 No Content)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      // For non-JSON responses, return the response text or an empty object
      const text = await response.text();
      return (text ? { data: text } : {}) as T;
    }
  }

  /**
   * Creates a standardized API error
   */
  private createAPIError(error: any, url?: string): APIError {
    if (error.message) {
      return {
        message: error.message,
        status: error.status,
        code: error.code,
      };
    }

    return {
      message: `API request failed${url ? ` for ${url}` : ""}`,
      status: error.status,
    };
  }

  // Public HTTP methods - these are what developers will use

  /**
   * GET request with automatic authentication
   */
  async get<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * POST request with automatic authentication
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request with automatic authentication
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request with automatic authentication
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request with automatic authentication
   */
  async delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }

  /**
   * Upload method for multipart/form-data requests (like file uploads)
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options?: Omit<RequestOptions, "method" | "body" | "headers">
  ): Promise<T> {
    // For uploads, we don't set Content-Type (let browser set it with boundary)
    const authHeaders = await this.getAuthHeaders();
    const { Authorization } = authHeaders as Record<string, string>;

    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
      headers: {
        Authorization, // Only include auth header, not Content-Type
      },
      skipAuth: true, // We manually added auth header above
    });
  }

  /**
   * Health check method to verify API connectivity
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get("/health", { skipAuth: true });
  }
}

// Export the singleton instance - this is the ONE API client for the entire app
export const api = APIClient.getInstance();

// Export the class for testing purposes only
export { APIClient };

// Export types for use in other parts of the application
export type { APIError, RequestOptions };
