import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

// Import our comprehensive API endpoint types
import type {
  APIEndpoints,
  EndpointResponse,
  EndpointRequest,
  UsersAPI,
  ProjectsAPI,
  EventsAPI,
  ProjectSearchParams,
  EventSearchParams,
  CreateEventRequest,
} from "@/types/api-endpoints";

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

    // Construct the full URL ensuring /api prefix
    let url: string;

    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      // Absolute URL - use as-is
      url = endpoint;
    } else if (endpoint.startsWith("/api/")) {
      // Already has /api prefix - use as-is
      url = endpoint;
    } else if (endpoint.startsWith("/")) {
      // Starts with / but not /api/ - prepend /api
      url = `/api${endpoint}`;
    } else {
      // Relative endpoint - prepend baseURL
      url = `${this.baseURL}/${endpoint}`;
    }

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
      // For API routes, if we get HTML instead of JSON, it's likely an error page
      const text = await response.text();

      // Check if this looks like an HTML error page
      if (
        text.trim().startsWith("<!DOCTYPE html>") ||
        text.trim().startsWith("<html")
      ) {
        console.error("🚨 API returned HTML instead of JSON:", {
          url: response.url,
          status: response.status,
          contentType,
          textPreview: text.substring(0, 200) + "...",
        });

        const error: APIError = {
          message: `API endpoint returned HTML instead of JSON (likely a server error)`,
          status: response.status,
        };

        throw error;
      }

      // For legitimate non-JSON responses, return the text wrapped in data
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
   * DELETE request with body and automatic authentication
   * Some APIs require a body in DELETE requests for complex operations
   */
  async deleteWithBody<T>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
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

  // =============================================================================
  // TYPE-SAFE ENDPOINT METHODS
  // Nuclear Authentication Refactor - Step 6
  // =============================================================================

  /**
   * Users API - Strongly typed methods for user management
   */
  users = {
    /**
     * Get all users (admin only)
     */
    getAll: (): Promise<EndpointResponse<"/api/users">> => {
      return this.get<EndpointResponse<"/api/users">>("/users");
    },

    /**
     * Get current user profile
     */
    getMe: () => {
      return this.get("/users/me");
    },

    /**
     * Update user profile
     */
    updateMe: (data: any) => {
      return this.put("/users/me", data);
    },
  };

  /**
   * Projects API - Strongly typed methods for project management
   */
  projects = {
    /**
     * Get all projects with optional filtering
     */
    getAll: (
      params?: ProjectSearchParams
    ): Promise<EndpointResponse<"/api/projects">> => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return this.get<EndpointResponse<"/api/projects">>(
        `/projects${query ? `?${query}` : ""}`
      );
    },

    /**
     * Get a specific project by ID
     */
    getById: (id: string) => {
      return this.get(`/projects/${id}`);
    },

    /**
     * Create a new project
     */
    create: (data: EndpointRequest<"/api/projects">) => {
      return this.post("/projects", data);
    },

    /**
     * Update a project
     */
    update: (id: string, data: Partial<EndpointRequest<"/api/projects">>) => {
      return this.put(`/projects/${id}`, data);
    },

    /**
     * Delete a project
     */
    delete: (id: string) => {
      return this.delete(`/projects/${id}`);
    },

    /**
     * Project Events sub-API
     */
    events: {
      /**
       * Get all events for a project
       */
      getAll: (projectId: string) => {
        return this.get(`/projects/${projectId}/events`);
      },

      /**
       * Create a new event for a project
       */
      create: (projectId: string, data: CreateEventRequest) => {
        return this.post(`/projects/${projectId}/events`, data);
      },

      /**
       * Update an event in a project
       */
      update: (
        projectId: string,
        eventId: string,
        data: Partial<CreateEventRequest>
      ) => {
        return this.put(`/projects/${projectId}/events/${eventId}`, data);
      },

      /**
       * Delete an event from a project
       */
      delete: (projectId: string, eventId: string) => {
        return this.delete(`/projects/${projectId}/events/${eventId}`);
      },

      /**
       * Attach an existing event to a project
       */
      attach: (projectId: string, eventId: string) => {
        return this.post(`/projects/${projectId}/events/attach`, { eventId });
      },

      /**
       * Detach an event from a project
       */
      detach: (projectId: string, eventId: string) => {
        return this.post(`/projects/${projectId}/events/detach`, { eventId });
      },

      /**
       * Create multiple events for a project
       */
      createBatch: (projectId: string, events: CreateEventRequest[]) => {
        return this.post(`/projects/${projectId}/events/batch`, { events });
      },
    },
  };

  /**
   * Events API - Strongly typed methods for event management
   */
  events = {
    /**
     * Get all events with optional filtering
     */
    getAll: (
      params?: EventSearchParams
    ): Promise<EndpointResponse<"/api/events">> => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return this.get<EndpointResponse<"/api/events">>(
        `/events${query ? `?${query}` : ""}`
      );
    },

    /**
     * Get a specific event by ID
     */
    getById: (id: string) => {
      return this.get(`/events/${id}`);
    },

    /**
     * Create a new event
     */
    create: (data: CreateEventRequest) => {
      return this.post("/events", data);
    },

    /**
     * Update an event
     */
    update: (id: string, data: Partial<CreateEventRequest>) => {
      return this.put(`/events/${id}`, data);
    },

    /**
     * Delete an event
     */
    delete: (id: string) => {
      return this.delete(`/events/${id}`);
    },
  };

  /**
   * Cars API - Strongly typed methods for car management
   */
  cars = {
    /**
     * Get all cars with optional filtering
     */
    getAll: (params?: any) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return this.get(`/cars${query ? `?${query}` : ""}`);
    },

    /**
     * Get a specific car by ID
     */
    getById: (id: string) => {
      return this.get(`/cars/${id}`);
    },

    /**
     * Create a new car
     */
    create: (data: any) => {
      return this.post("/cars", data);
    },

    /**
     * Update a car
     */
    update: (id: string, data: any) => {
      return this.put(`/cars/${id}`, data);
    },

    /**
     * Delete a car
     */
    delete: (id: string) => {
      return this.delete(`/cars/${id}`);
    },
  };

  /**
   * Media API - File uploads and image management
   */
  media = {
    /**
     * Upload files
     */
    upload: (formData: FormData) => {
      return this.upload("/upload", formData);
    },

    /**
     * Get all images with optional filtering
     */
    getImages: (params?: any) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return this.get(`/images${query ? `?${query}` : ""}`);
    },

    /**
     * Get a specific image by ID
     */
    getImageById: (id: string) => {
      return this.get(`/images/${id}`);
    },

    /**
     * Update image metadata
     */
    updateImage: (id: string, data: any) => {
      return this.put(`/images/${id}`, data);
    },

    /**
     * Delete an image
     */
    deleteImage: (id: string) => {
      return this.delete(`/images/${id}`);
    },
  };

  /**
   * System API - Health checks and system information
   */
  system = {
    /**
     * Get system health status
     */
    health: () => {
      return this.get("/system/health", { skipAuth: true });
    },

    /**
     * Get system statistics (admin only)
     */
    stats: () => {
      return this.get("/system/stats");
    },
  };
}

// Export the singleton instance - this is the ONE API client for the entire app
export const api = APIClient.getInstance();

// Export the class for testing purposes only
export { APIClient };

// Export types for use in other parts of the application
export type { APIError, RequestOptions };

// Export API endpoint types for full type safety
export type {
  APIEndpoints,
  EndpointResponse,
  EndpointRequest,
  ProjectSearchParams,
  EventSearchParams,
  CreateEventRequest,
  UsersAPI,
  ProjectsAPI,
  EventsAPI,
} from "@/types/api-endpoints";
