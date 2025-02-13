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
    console.log("[DEBUG] getApiUrl - Constructing OpenAI endpoint");
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
    });

    // Ensure the endpoint is a valid URL
    try {
      new URL(endpoint);
    } catch (error) {
      console.error(
        "[ERROR] getApiUrl - Invalid OpenAI endpoint URL:",
        endpoint
      );
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
