// This file validates and exports environment variables for type safety
// It runs on the server side only

// Log environment configuration
const baseUrl = (() => {
  // For development environment
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // For Vercel deployments
  if (process.env.VERCEL_URL && !process.env.NEXTAUTH_URL) {
    const url = process.env.VERCEL_URL;
    // Remove any protocol prefix if present
    const cleanUrl = url.replace(/^https?:\/\//, "");
    // Always use https for Vercel deployments
    return `https://${cleanUrl}`;
  }

  // If NEXTAUTH_URL is explicitly set, use that
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // Fallback for other environments
  return undefined;
})();

// Log all relevant environment variables for debugging
console.log("Environment Configuration:", {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  computed_baseUrl: baseUrl,
});

// Set NEXTAUTH_URL if it's not already set
if (!process.env.NEXTAUTH_URL && baseUrl) {
  process.env.NEXTAUTH_URL = baseUrl;
}

// Type-safe environment variables
export const env = {
  firebase: {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  },
  baseUrl,
} as const;

// Server-side environment validation
if (typeof window === "undefined") {
  const requiredServerVars = [
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ];

  const missing = requiredServerVars.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Map public Firebase config to Admin SDK
  process.env.FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Format private key if needed
  if (
    process.env.FIREBASE_PRIVATE_KEY &&
    !process.env.FIREBASE_PRIVATE_KEY.includes("-----BEGIN PRIVATE KEY-----")
  ) {
    process.env.FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY.replace(
      /\\n/g,
      "\n"
    );
  }
}
