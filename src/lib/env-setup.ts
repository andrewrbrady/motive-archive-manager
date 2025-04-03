// Environment setup that runs before any other imports
function setupEnvironment() {
  // For production deployments
  if (process.env.VERCEL_ENV === "production") {
    // Use the main deployment URL
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
    return;
  }

  // For preview deployments
  if (process.env.VERCEL_ENV === "preview") {
    // Use the deployment URL provided by Vercel
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
    return;
  }

  // For development environment
  if (process.env.NODE_ENV === "development") {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    return;
  }

  // Final fallback
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  }
}

// Run setup immediately
setupEnvironment();

// Log environment for verification
console.log("Auth configuration:", {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
});
