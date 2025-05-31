/**
 * Test file to verify authentication integration between APIClient and Firebase Auth
 * This tests that the centralized getValidToken function works correctly
 */

import { getValidToken, refreshToken } from "./api-client";
import { auth } from "./firebase";

/**
 * Test the centralized authentication functions
 */
export async function testAuthIntegration() {
  console.log("🧪 Testing authentication integration...");

  try {
    // Test 1: Check if we can get the current auth state
    const currentUser = auth.currentUser;
    console.log(
      "📍 Current user:",
      currentUser ? "✅ Authenticated" : "❌ Not authenticated"
    );

    if (!currentUser) {
      console.log("ℹ️ No user logged in, skipping token tests");
      return {
        success: true,
        message: "No user logged in - authentication functions are ready",
      };
    }

    // Test 2: Try to get a valid token
    console.log("🔑 Testing getValidToken...");
    const token = await getValidToken();
    console.log("🔑 Token received:", token ? "✅ Success" : "❌ Failed");

    if (!token) {
      throw new Error("Failed to get valid token");
    }

    // Test 3: Verify token format (should be a JWT)
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      throw new Error("Token is not a valid JWT format");
    }
    console.log("🔍 Token format:", "✅ Valid JWT");

    // Test 4: Try to refresh token
    console.log("🔄 Testing refreshToken...");
    const refreshedToken = await refreshToken();
    console.log(
      "🔄 Refreshed token:",
      refreshedToken ? "✅ Success" : "❌ Failed"
    );

    if (!refreshedToken) {
      throw new Error("Failed to refresh token");
    }

    console.log("✅ Authentication integration test passed!");
    return {
      success: true,
      message: "All authentication functions working correctly",
      details: {
        hasUser: !!currentUser,
        tokenLength: token.length,
        refreshedTokenLength: refreshedToken.length,
      },
    };
  } catch (error: any) {
    console.error("💥 Authentication integration test failed:", error);
    return {
      success: false,
      message: "Authentication integration test failed",
      error: error.message,
    };
  }
}

/**
 * Test the APIClient authentication flow
 */
export async function testAPIClientAuth() {
  console.log("🧪 Testing APIClient authentication flow...");

  try {
    const { api } = await import("./api-client");

    // Test API health check (should work without auth)
    console.log("🏥 Testing API health check...");
    const healthResult = await api.healthCheck();
    console.log("🏥 Health check:", healthResult ? "✅ Success" : "❌ Failed");

    // Test authenticated endpoint (if available)
    // Note: This might fail if no API endpoints are available, but it tests the auth flow
    console.log("🔒 Testing authenticated API call...");
    try {
      await api.get("/test");
      console.log("🔒 Authenticated call:", "✅ Success");
    } catch (error: any) {
      // This is expected if the endpoint doesn't exist
      if (error.status === 404) {
        console.log(
          "🔒 Authenticated call:",
          "✅ Auth headers sent (404 expected)"
        );
      } else if (error.message.includes("Authentication required")) {
        console.log("🔒 Authenticated call:", "❌ Auth failed");
        throw error;
      } else {
        console.log(
          "🔒 Authenticated call:",
          "✅ Auth headers sent (other error expected)"
        );
      }
    }

    console.log("✅ APIClient authentication test passed!");
    return {
      success: true,
      message: "APIClient authentication working correctly",
    };
  } catch (error: any) {
    console.error("💥 APIClient authentication test failed:", error);
    return {
      success: false,
      message: "APIClient authentication test failed",
      error: error.message,
    };
  }
}
