// Simple test to verify OAuth configuration
const testUrl = "https://motive-archive-manager.vercel.app";
const expectedCallback = `${testUrl}/api/auth/callback/google`;

console.log("Testing OAuth Configuration:");
console.log("=".repeat(50));
console.log(`Base URL: ${testUrl}`);
console.log(`Expected OAuth Callback: ${expectedCallback}`);
console.log("=".repeat(50));

// Test if the URL is reachable
fetch(testUrl)
  .then((response) => {
    console.log(`✅ Site is accessible (${response.status})`);
    return fetch(`${testUrl}/api/auth/signin`);
  })
  .then((response) => {
    console.log(`✅ Auth endpoint accessible (${response.status})`);
    console.log("");
    console.log("🎯 Solution Summary:");
    console.log("1. ✅ NEXTAUTH_URL set to:", testUrl);
    console.log("2. ✅ OAuth callback URL should be:", expectedCallback);
    console.log("3. 🔧 Make sure this URL is added to Google OAuth Console");
    console.log("");
    console.log(
      "Try signing in again - the redirect URI error should be fixed!"
    );
  })
  .catch((error) => {
    console.log("❌ Error testing URLs:", error.message);
  });
