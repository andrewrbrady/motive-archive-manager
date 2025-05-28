// This file validates and exports environment variables for type safety
// It runs on the server side only

// Improved URL resolution logic
function getBaseUrl(): string {
  // 1. Check for explicit NEXTAUTH_URL first
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // 2. For development
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // 3. For Vercel production/preview
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4. Fallback for other hosting providers
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // 5. Last resort - throw error instead of undefined
  throw new Error(
    "Unable to determine base URL. Please set NEXTAUTH_URL environment variable."
  );
}

const baseUrl = getBaseUrl();

// Set NEXTAUTH_URL if not already set (for NextAuth.js)
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = baseUrl;
}

// console.log("Environment Configuration:", {
//   NODE_ENV: process.env.NODE_ENV,
//   VERCEL_ENV: process.env.VERCEL_ENV,
//   VERCEL_URL: process.env.VERCEL_URL,
//   NEXTAUTH_URL: process.env.NEXTAUTH_URL,
//   computed_baseUrl: baseUrl,
//   oauth_callback_url: `${baseUrl}/api/auth/callback/google`,
// });

// Type-safe environment variables
export const env = {
  firebase: {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  },
  baseUrl,
  oauthCallbackUrl: `${baseUrl}/api/auth/callback/google`,
} as const;

// Server-side environment validation
if (typeof window === "undefined") {
  const requiredServerVars = [
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ];

  const missing = requiredServerVars.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Validate OAuth configuration
  if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    throw new Error(
      "Missing AUTH_SECRET or NEXTAUTH_SECRET environment variable"
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
