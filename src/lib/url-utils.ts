/**
 * URL utility functions
 */

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Browser environment
    return window.location.origin;
  }

  // Server environment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // For local development, always use the same port as the app itself for API calls
  // This ensures server-side rendering works correctly when calling internal APIs
  return "http://localhost:3000";
}
