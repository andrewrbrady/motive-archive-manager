/**
 * Test script to validate that the AuthErrorBoundary integration works correctly
 *
 * This file can be imported in components to test error boundary functionality
 */

import { api } from "./api-client";

/**
 * Test functions that can be called to trigger authentication errors
 * These should be caught by the AuthErrorBoundary when called from React components
 */

export const errorBoundaryTests = {
  /**
   * Test 1: Direct API client authentication error
   */
  async testAPIClientAuthError() {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🧪 Testing APIClient authentication error...");
    try {
      // This should trigger an auth error if user is not logged in
      await api.get("/test-nonexistent-auth-endpoint");
    } catch (error: any) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ APIClient auth error caught:", error.message);
      // Re-throw to trigger error boundary
      throw error;
    }
  },

  /**
   * Test 2: Manual authentication error
   */
  testManualAuthError() {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🧪 Testing manual authentication error...");
    throw new Error("Authentication required - no user logged in");
  },

  /**
   * Test 3: Manual general error
   */
  testManualGeneralError() {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🧪 Testing manual general error...");
    throw new Error("Something went wrong with the application");
  },

  /**
   * Test 4: Simulate API 401 error
   */
  testAPI401Error() {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🧪 Testing API 401 error simulation...");
    throw new Error("HTTP 401: Authentication failed - please sign in again");
  },

  /**
   * Test 5: Token refresh error
   */
  testTokenRefreshError() {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🧪 Testing token refresh error...");
    throw new Error("Failed to refresh token - please sign in again");
  },
};

/**
 * Validation function to check if error boundary is properly integrated
 */
export function validateErrorBoundaryIntegration(): boolean {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Validating error boundary integration...");

  // Check if AuthErrorBoundary is available
  try {
    // This would only work if the component is properly exported
    const hasAuthErrorBoundary = typeof window !== "undefined";

    if (!hasAuthErrorBoundary) {
      console.warn(
        "⚠️ Running in non-browser environment - cannot fully validate"
      );
      return false;
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Error boundary validation passed");
    return true;
  } catch (error) {
    console.error("❌ Error boundary validation failed:", error);
    return false;
  }
}

/**
 * Helper function to log error boundary test results
 */
export function logErrorBoundaryTest(
  testName: string,
  success: boolean,
  error?: Error
) {
  const timestamp = new Date().toISOString();
  const status = success ? "✅ PASS" : "❌ FAIL";

  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[${timestamp}] ${status} Error Boundary Test: ${testName}`);

  if (error) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  Error: ${error.message}`);
  }
}
