import { NextRequest } from "next/server";

/**
 * Get the correct base URL for OAuth redirects
 * Handles development 0.0.0.0 binding issues and production environment detection
 */
export function getBaseUrl(req: NextRequest): string {
  // In production, use the NEXTAUTH_URL or determine from request headers
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXTAUTH_URL || `https://${req.headers.get("host")}`;
  }

  // In development, handle the 0.0.0.0 binding issue
  const host = req.headers.get("host");
  if (host?.includes("0.0.0.0")) {
    return "http://localhost:3000"; // Convert 0.0.0.0 to localhost in dev
  }

  return `http://${host}`;
}

/**
 * Get the YouTube OAuth callback URL for the current environment
 */
export function getYouTubeCallbackUrl(req: NextRequest): string {
  return `${getBaseUrl(req)}/api/youtube/callback`;
}
