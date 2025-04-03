// Environment setup that runs before any other imports
function setupEnvironment() {
  // For production and preview deployments
  if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
    return;
  }

  // For development environment
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}

// Run setup immediately
setupEnvironment();

// Log environment for verification
console.log("Auth configuration:", {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  NODE_ENV: process.env.NODE_ENV,
});
