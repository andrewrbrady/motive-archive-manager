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

  // In development
  if (process.env.NODE_ENV === "development") {
    return `http://localhost:3000/api/${cleanPath}`;
  }

  // In production
  if (isBrowser) {
    // Client-side: use relative URL
    return `/api/${cleanPath}`;
  } else {
    // Server-side: construct absolute URL
    let baseUrl: string;

    if (process.env.VERCEL_URL) {
      // Using Vercel's deployment URL
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NEXT_PUBLIC_BASE_URL) {
      // Using configured base URL
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    } else {
      // Fallback URL
      baseUrl = "https://motive-archive-manager.vercel.app";
    }

    // Ensure baseUrl doesn't end with a slash
    baseUrl = baseUrl.replace(/\/$/, "");

    return `${baseUrl}/api/${cleanPath}`;
  }
}
