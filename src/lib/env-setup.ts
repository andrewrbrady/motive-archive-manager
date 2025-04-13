// This file validates and exports environment variables for type safety
// It runs on the server side only

// Log environment configuration
const baseUrl =
  process.env.NEXTAUTH_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined);

console.log("Environment Configuration:", {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  computed_baseUrl: baseUrl,
});

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
