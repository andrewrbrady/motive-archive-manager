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

// Get the deployment URL based on environment
export function getBaseUrl(): string {
  // For production deployments
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // For preview deployments (including branches and PRs)
  if (process.env.VERCEL_ENV === "preview") {
    if (process.env.VERCEL_BRANCH_URL) {
      return `https://${process.env.VERCEL_BRANCH_URL}`;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
  }
  // For development environment
  if (
    process.env.VERCEL_ENV === "development" ||
    process.env.NODE_ENV === "development"
  ) {
    return "http://localhost:3001";
  }
  // Fallback to NEXT_PUBLIC_BASE_URL if available
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // Final fallback
  return "http://localhost:3001";
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

    return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
  }

  // In development or browser environment, use relative paths
  if (process.env.NODE_ENV === "development" || isBrowser) {
    return `/api/${cleanPath}`;
  }

  // In production server-side, use absolute URLs
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/${cleanPath}`;
}

/**
 * Formats a date into a readable string format
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: string | number | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
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
