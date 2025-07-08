#!/usr/bin/env node

/**
 * Gallery Image Processing Debug Test Script
 *
 * This script tests the /api/galleries/[id]/preview-process-image endpoint directly
 * to isolate whether the issue is in the frontend (hook/modal) or backend (API).
 *
 * Usage: node test-gallery-image-processing-debug.js
 */

// Test configuration - UPDATE THESE VALUES WITH REAL IDs FROM YOUR SYSTEM
const TEST_CONFIG = {
  // You'll need to replace these with actual values from your database
  galleryId: "6751a123b45c6789def01234", // Replace with real gallery ID
  imageId: "6751b456c78d9012ef345678", // Replace with real image ID from that gallery
  baseUrl: "http://localhost:3000", // Update if running on different port
};

async function testAPIEndpointDirectly() {
  console.log("🔍 GALLERY API DEBUG - Starting direct API endpoint test");
  console.log("🔍 Test Configuration:", TEST_CONFIG);

  const endpoint = `/api/galleries/${TEST_CONFIG.galleryId}/preview-process-image`;
  const fullUrl = `${TEST_CONFIG.baseUrl}${endpoint}`;

  const testPayload = {
    imageId: TEST_CONFIG.imageId,
    processingType: "image-crop",
    parameters: {
      imageUrl: "https://imagedelivery.net/example/test-image",
      cropX: 0,
      cropY: 0,
      cropWidth: 100,
      cropHeight: 100,
      outputWidth: 1080,
      outputHeight: 1920,
      scale: 1.0,
    },
  };

  console.log("🔍 GALLERY API DEBUG - Request details:", {
    url: fullUrl,
    method: "POST",
    payloadKeys: Object.keys(testPayload),
    payloadSize: JSON.stringify(testPayload).length,
  });

  try {
    console.log("🔍 GALLERY API DEBUG - Making fetch request...");
    const fetchStart = Date.now();

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Note: This test doesn't include authentication - that might be the issue!
      },
      body: JSON.stringify(testPayload),
    });

    const fetchDuration = Date.now() - fetchStart;

    console.log("🔍 GALLERY API DEBUG - Response received:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${fetchDuration}ms`,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    console.log("🔍 GALLERY API DEBUG - Response headers:", {
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Try to get response body
    let responseBody = null;
    let responseText = null;

    try {
      responseText = await response.text();
      console.log("🔍 GALLERY API DEBUG - Raw response text:", {
        length: responseText.length,
        preview: responseText.substring(0, 500),
        isHTML:
          responseText.trim().startsWith("<!DOCTYPE") ||
          responseText.trim().startsWith("<html"),
      });

      // Try to parse as JSON
      if (responseText) {
        responseBody = JSON.parse(responseText);
        console.log(
          "🔍 GALLERY API DEBUG - Parsed response body:",
          responseBody
        );
      }
    } catch (parseError) {
      console.error("🔍 GALLERY API DEBUG - Failed to parse response:", {
        parseError: parseError.message,
        responseText: responseText?.substring(0, 200),
      });
    }

    if (!response.ok) {
      console.error("🔍 GALLERY API DEBUG - Request failed with non-ok status");
      return {
        success: false,
        error: "Non-ok status",
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      };
    }

    console.log("✅ GALLERY API DEBUG - Request completed successfully");
    return {
      success: true,
      status: response.status,
      body: responseBody,
    };
  } catch (error) {
    console.error("🔍 GALLERY API DEBUG - Network error occurred:", {
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorMessage: error?.message,
      errorStack: error?.stack?.substring(0, 300),
      isError: error instanceof Error,
    });

    // Try to extract as much info as possible from the error
    let errorAnalysis = {
      toString: error?.toString?.(),
      valueOf: error?.valueOf?.(),
      keys: error && typeof error === "object" ? Object.keys(error) : [],
      ownProperties:
        error && typeof error === "object"
          ? Object.getOwnPropertyNames(error)
          : [],
    };

    try {
      errorAnalysis.serialized = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error)
      );
    } catch (serializationError) {
      console.error(
        "🔍 GALLERY API DEBUG - Error serialization failed:",
        serializationError
      );
    }

    console.error(
      "🔍 GALLERY API DEBUG - Comprehensive error analysis:",
      errorAnalysis
    );

    return {
      success: false,
      error: error.message || "Network error",
      details: error,
    };
  }
}

async function testWithMultipleApproaches() {
  console.log("🚀 GALLERY API DEBUG - Starting comprehensive API testing");

  // Test 1: Direct endpoint test
  console.log("\n=== TEST 1: Direct API endpoint test ===");
  const directResult = await testAPIEndpointDirectly();
  console.log("Direct test result:", directResult);

  // Test 2: Check if endpoint exists (OPTIONS request)
  console.log("\n=== TEST 2: Endpoint existence check ===");
  try {
    const optionsResponse = await fetch(
      `${TEST_CONFIG.baseUrl}/api/galleries/${TEST_CONFIG.galleryId}/preview-process-image`,
      {
        method: "OPTIONS",
      }
    );
    console.log("OPTIONS response:", {
      status: optionsResponse.status,
      statusText: optionsResponse.statusText,
      headers: Object.fromEntries(optionsResponse.headers.entries()),
    });
  } catch (optionsError) {
    console.error("OPTIONS request failed:", optionsError);
  }

  // Test 3: Check if galleries endpoint exists at all
  console.log("\n=== TEST 3: Base galleries endpoint check ===");
  try {
    const baseResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/galleries`, {
      method: "GET",
    });
    console.log("Base galleries endpoint response:", {
      status: baseResponse.status,
      statusText: baseResponse.statusText,
    });
  } catch (baseError) {
    console.error("Base galleries endpoint failed:", baseError);
  }

  console.log("\n=== SUMMARY ===");
  console.log(
    "🔍 Direct API test completed. Check the logs above for detailed error information."
  );
  console.log(
    "🔍 If you see authentication errors, that's likely the root cause."
  );
  console.log(
    "🔍 If you see 404 errors, the endpoint routing may be incorrect."
  );
  console.log(
    "🔍 If you see empty {} errors, we need to trace further into the code."
  );
}

// Run the test
if (require.main === module) {
  console.log("🔍 GALLERY API DEBUG SCRIPT STARTING");
  console.log(
    "📝 Remember to update TEST_CONFIG with real gallery and image IDs!"
  );
  console.log(
    "🚨 This test does NOT include authentication - expect 401 errors if auth is required\n"
  );

  testWithMultipleApproaches()
    .then(() => {
      console.log("\n✅ Test script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test script failed:", error);
      process.exit(1);
    });
}

module.exports = {
  testAPIEndpointDirectly,
  testWithMultipleApproaches,
  TEST_CONFIG,
};
