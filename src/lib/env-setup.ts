// Environment setup that runs before any other imports
function setupEnvironment() {
  // For production deployments
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    return;
  }

  // For preview deployments (including branches and PRs)
  if (process.env.VERCEL_ENV === "preview") {
    if (process.env.VERCEL_BRANCH_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_BRANCH_URL}`;
      return;
    }
    if (process.env.VERCEL_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
      return;
    }
  }

  // For development environment
  if (
    process.env.VERCEL_ENV === "development" ||
    process.env.NODE_ENV === "development"
  ) {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    return;
  }

  // Fallback to NEXT_PUBLIC_BASE_URL if available
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_BASE_URL;
    return;
  }

  // Final fallback
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  }
}

// Run setup immediately
setupEnvironment();

// Log environment for debugging
console.log("Environment Setup Complete:");
console.log("- NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("- VERCEL_ENV:", process.env.VERCEL_ENV);
console.log("- NODE_ENV:", process.env.NODE_ENV);
