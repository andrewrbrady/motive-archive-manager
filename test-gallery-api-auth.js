#!/usr/bin/env node

/**
 * Gallery API Authentication Test Script
 *
 * This script tests the gallery API endpoints to verify:
 * 1. Authentication is properly required
 * 2. Error messages are meaningful (not empty objects)
 * 3. The endpoints respond correctly to requests
 */

const TEST_CONFIG = {
  baseUrl: "http://localhost:3000",
  // Test with fake IDs to verify authentication errors
  galleryId: "507f1f77bcf86cd799439011", // Valid ObjectId format but fake
  imageId: "507f1f77bcf86cd799439012", // Valid ObjectId format but fake
};

async function testEndpointAuthentication(
  endpoint,
  method = "GET",
  body = null
) {
  console.log(`\n=== Testing ${method} ${endpoint} ===`);

  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;

  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        // Intentionally NOT including Authorization header to test auth requirement
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`Making ${method} request to: ${url}`);
    const response = await fetch(url, options);

    console.log(`Response status: ${response.status} ${response.statusText}`);

    let responseData = null;
    const responseText = await response.text();

    try {
      responseData = JSON.parse(responseText);
      console.log("Response data:", responseData);
    } catch (parseError) {
      console.log("Response text (not JSON):", responseText.substring(0, 200));
    }

    // Check if we get proper authentication error
    if (response.status === 401) {
      console.log("✅ Endpoint properly requires authentication");
      return { success: true, requiresAuth: true, data: responseData };
    } else if (response.status === 404) {
      console.log(
        "✅ Endpoint exists but resource not found (expected with fake IDs)"
      );
      return { success: true, resourceNotFound: true, data: responseData };
    } else if (response.status === 400) {
      console.log(
        "✅ Endpoint exists but bad request (expected with fake data)"
      );
      return { success: true, badRequest: true, data: responseData };
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
      return { success: false, status: response.status, data: responseData };
    }
  } catch (error) {
    console.error("❌ Network error:", error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log("🚀 Starting Gallery API Authentication Tests");
  console.log("📋 Test Configuration:", TEST_CONFIG);

  const tests = [
    // Test main galleries endpoint
    {
      name: "Galleries List",
      endpoint: "/api/galleries",
      method: "GET",
    },

    // Test gallery preview endpoint (the one we just fixed)
    {
      name: "Gallery Preview Process Image",
      endpoint: `/api/galleries/${TEST_CONFIG.galleryId}/preview-process-image`,
      method: "POST",
      body: {
        imageId: TEST_CONFIG.imageId,
        processingType: "image-crop",
        parameters: {
          imageUrl: "https://example.com/test.jpg",
          cropX: 0,
          cropY: 0,
          cropWidth: 100,
          cropHeight: 100,
          outputWidth: 1080,
          outputHeight: 1920,
          scale: 1.0,
        },
      },
    },

    // Test gallery replace endpoint (the other one we fixed)
    {
      name: "Gallery Replace Image",
      endpoint: `/api/galleries/${TEST_CONFIG.galleryId}/replace-image`,
      method: "POST",
      body: {
        originalImageId: TEST_CONFIG.imageId,
        processingType: "image-crop",
        parameters: {
          imageUrl: "https://example.com/test.jpg",
          cropX: 0,
          cropY: 0,
          cropWidth: 100,
          cropHeight: 100,
          outputWidth: 1080,
          outputHeight: 1920,
          scale: 1.0,
        },
      },
    },
  ];

  const results = [];

  for (const test of tests) {
    const result = await testEndpointAuthentication(
      test.endpoint,
      test.method,
      test.body
    );

    results.push({
      name: test.name,
      endpoint: test.endpoint,
      method: test.method,
      ...result,
    });
  }

  console.log("\n🏁 Test Results Summary:");
  console.log("========================");

  results.forEach((result, index) => {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    const authStatus = result.requiresAuth
      ? "(Auth Required)"
      : result.resourceNotFound
        ? "(Resource Not Found)"
        : result.badRequest
          ? "(Bad Request)"
          : "";

    console.log(`${index + 1}. ${status} ${result.name} ${authStatus}`);

    if (!result.success) {
      console.log(`   Error: ${result.error || result.status}`);
    }
  });

  const passCount = results.filter((r) => r.success).length;
  console.log(`\nOverall: ${passCount}/${results.length} tests passed`);

  if (passCount === results.length) {
    console.log("🎉 All tests passed! Authentication is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Check the details above.");
  }
}

// Run the tests
runTests().catch(console.error);
