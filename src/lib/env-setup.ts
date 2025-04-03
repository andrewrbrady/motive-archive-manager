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
    // Get the actual URL from the request if available
    const actualUrl = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
    if (actualUrl) {
      // Ensure we're using the git-based preview URL pattern
      if (actualUrl.includes("-git-")) {
        process.env.NEXTAUTH_URL = `https://${actualUrl}`;
      } else {
        // Convert to git-based URL pattern
        const [projectName, ...rest] = actualUrl.split("-");
        const branchId = rest.join("-").split(".")[0];
        process.env.NEXTAUTH_URL = `https://${projectName}-git-${branchId}-andrew-andrewrbradys-projects.vercel.app`;
      }
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
console.log("Auth environment check:", {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "Not set",
  NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
});
