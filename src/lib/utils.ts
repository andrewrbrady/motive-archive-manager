// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTimeRemaining(endDate?: string): string {
  if (!endDate) return "N/A";

  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined";

  // Special handling for OpenAI endpoint
  if (cleanPath === "openai") {
    console.log("[DEBUG] getApiUrl - Environment variables:", {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      hasOpenAIEndpoint: !!process.env.OPENAI_API_ENDPOINT,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    });

    const endpoint = process.env.OPENAI_API_ENDPOINT;

    if (!endpoint) {
      console.error("[ERROR] getApiUrl - OPENAI_API_ENDPOINT is not defined");
      throw new Error(
        "OPENAI_API_ENDPOINT environment variable is not defined"
      );
    }

    // Log the endpoint for debugging
    console.log("[DEBUG] getApiUrl - OpenAI endpoint details:", {
      raw: endpoint,
      cleaned: endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint,
      environment: process.env.NODE_ENV,
      isBrowser: typeof window !== "undefined",
      isHttps: endpoint.startsWith("https://"),
      isLocalhost: endpoint.includes("localhost"),
    });

    // Ensure the endpoint is a valid URL
    try {
      const url = new URL(endpoint);
      console.log("[DEBUG] getApiUrl - Parsed URL details:", {
        protocol: url.protocol,
        host: url.host,
        pathname: url.pathname,
        search: url.search,
      });
    } catch (error) {
      console.error("[ERROR] getApiUrl - Invalid OpenAI endpoint URL:", {
        endpoint,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Invalid OpenAI API endpoint URL");
    }

    // Ensure the endpoint doesn't end with a slash
    return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
  }

  // In development
  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG] getApiUrl - Development environment");
    return `http://localhost:3000/api/${cleanPath}`;
  }

  // In production
  if (isBrowser) {
    console.log("[DEBUG] getApiUrl - Browser environment");
    // Client-side: use relative URL
    return `/api/${cleanPath}`;
  } else {
    console.log("[DEBUG] getApiUrl - Server environment");
    // Server-side: construct absolute URL
    let baseUrl = "";

    if (process.env.VERCEL_URL) {
      // Using Vercel's deployment URL
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NEXT_PUBLIC_BASE_URL) {
      // Using configured base URL
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      // Ensure HTTPS for non-localhost URLs
      if (!baseUrl.startsWith("http://localhost")) {
        baseUrl = baseUrl.replace(/^http:/, "https:");
      }
    } else {
      console.error(
        "[ERROR] getApiUrl - No base URL configured for production"
      );
      throw new Error("No base URL configured for production environment");
    }

    // Ensure baseUrl doesn't end with a slash
    baseUrl = baseUrl.replace(/\/$/, "");

    console.log(
      "[DEBUG] getApiUrl - Constructed URL:",
      `${baseUrl}/api/${cleanPath}`
    );
    return `${baseUrl}/api/${cleanPath}`;
  }
}

/**
 * Formats a date into a readable string format
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number | undefined): string {
  if (!date) return "";

  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) return "";

  // Format: Month Day, Year
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getInitials(name: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

// Check if user has specific role
export function hasRole(
  userRoles: string[] | undefined,
  requiredRole: string | string[]
): boolean {
  if (!userRoles || userRoles.length === 0) return false;

  const rolesToCheck = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  return userRoles.some((role) => rolesToCheck.includes(role));
}

// Check if user has any of the specified permissions
export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: string | string[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;

  const permissionsToCheck = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  return userPermissions.some((permission) =>
    permissionsToCheck.includes(permission)
  );
}
