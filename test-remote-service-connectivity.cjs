const fetch = require("node-fetch");

async function testRemoteServiceHealth() {
  console.log("🏥 REMOTE SERVICE HEALTH CHECK 🏥");
  console.log("==================================");

  const remoteServiceUrl =
    process.env.CANVAS_EXTENSION_SERVICE_URL ||
    "https://canvas-service-public-425215.uc.r.appspot.com";

  console.log(`🔗 Testing Remote Service: ${remoteServiceUrl}`);

  try {
    // Test health endpoint
    const healthResponse = await fetch(`${remoteServiceUrl}/health`, {
      method: "GET",
      timeout: 10000,
    });

    console.log(
      `📊 Health Status: ${healthResponse.status} ${healthResponse.statusText}`
    );

    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log(`✅ Health Response: ${healthData}`);
    } else {
      console.log("❌ Health check failed");
      return false;
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error.message}`);
    return false;
  }

  return true;
}

async function testCloudflareImageAccess() {
  console.log("\n🔗 CLOUDFLARE IMAGE ACCESS TESTS 🔗");
  console.log("===================================");

  // Test different Cloudflare URL formats to see which ones are publicly accessible
  const testUrls = [
    {
      name: "Public URL (standard)",
      url: "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/public",
    },
    {
      name: "Public URL (test account)",
      url: "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public",
    },
    {
      name: "High resolution",
      url: "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/w=3000,q=95",
    },
    {
      name: "Standard resolution",
      url: "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/w=1080,q=90",
    },
  ];

  const accessibleUrls = [];

  for (const test of testUrls) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`📤 URL: ${test.url}`);

    try {
      const response = await fetch(test.url, {
        method: "HEAD",
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Canvas Extension Test)",
        },
      });

      console.log(`📥 Status: ${response.status} ${response.statusText}`);
      console.log(`📊 Content-Type: ${response.headers.get("content-type")}`);
      console.log(
        `📊 Content-Length: ${response.headers.get("content-length")}`
      );

      if (
        response.ok &&
        response.headers.get("content-type")?.includes("image")
      ) {
        console.log("✅ Accessible to remote service");
        accessibleUrls.push(test.url);
      } else {
        console.log("❌ Not accessible or not an image");
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  console.log(
    `\n📊 Summary: ${accessibleUrls.length}/${testUrls.length} URLs accessible`
  );
  return accessibleUrls;
}

async function testRemoteServiceWithCloudflareUrls() {
  console.log("\n🌐 REMOTE SERVICE + CLOUDFLARE TESTS 🌐");
  console.log("========================================");

  const remoteServiceUrl =
    process.env.CANVAS_EXTENSION_SERVICE_URL ||
    "https://canvas-service-public-425215.uc.r.appspot.com";

  if (!remoteServiceUrl) {
    console.log("❌ No CANVAS_EXTENSION_SERVICE_URL environment variable");
    return;
  }

  // Test accessible Cloudflare URLs
  const accessibleUrls = await testCloudflareImageAccess();

  if (accessibleUrls.length === 0) {
    console.log("❌ No accessible Cloudflare URLs found for testing");
    return;
  }

  const testPayloads = [
    {
      name: "Basic canvas extension (small)",
      payload: {
        imageUrl: accessibleUrls[0],
        desiredHeight: 1350,
        paddingPct: 0.05,
        whiteThresh: 90,
      },
    },
    {
      name: "Canvas extension with high resolution",
      payload: {
        imageUrl:
          accessibleUrls.find((url) => url.includes("w=3000")) ||
          accessibleUrls[0],
        desiredHeight: 1350,
        paddingPct: 0.05,
        whiteThresh: 90,
      },
    },
    {
      name: "Large dimensions test",
      payload: {
        imageUrl: accessibleUrls[0],
        desiredHeight: 2000,
        paddingPct: 0.1,
        whiteThresh: -1, // Auto-detect
      },
    },
  ];

  for (const test of testPayloads) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log("📤 Payload:", JSON.stringify(test.payload, null, 2));

    try {
      const startTime = Date.now();
      const response = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(test.payload),
        timeout: 30000, // 30 second timeout
      });

      const duration = Date.now() - startTime;
      console.log(
        `📥 Status: ${response.status} ${response.statusText} (${duration}ms)`
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ SUCCESS!");
        console.log("📊 Result keys:", Object.keys(result));
        console.log("📊 Has processedImageUrl:", !!result.processedImageUrl);

        if (result.processedImageUrl) {
          const base64Length = result.processedImageUrl.length;
          console.log(`📊 Base64 image length: ${base64Length} characters`);
          console.log(
            `📊 Estimated size: ~${Math.round((base64Length * 0.75) / 1024)}KB`
          );
        }

        if (result.message) {
          console.log(`📊 Message: ${result.message}`);
        }
      } else {
        const errorText = await response.text();
        console.log("❌ FAILED!");
        console.log("📊 Error response:", errorText);

        // Try to understand the error
        if (response.status === 403) {
          console.log(
            "🔍 403 Forbidden - Cloudflare image may not be accessible to remote service"
          );
        } else if (response.status === 500) {
          console.log(
            "🔍 500 Server Error - Remote service may have processing issues"
          );
        } else if (response.status === 404) {
          console.log(
            "🔍 404 Not Found - Remote service endpoint may be incorrect"
          );
        }
      }
    } catch (error) {
      console.log("❌ REQUEST FAILED!");
      console.log("📊 Error:", error.message);

      if (error.message.includes("timeout")) {
        console.log(
          "🔍 Request timeout - remote service may be slow or overloaded"
        );
      } else if (error.message.includes("ECONNREFUSED")) {
        console.log("🔍 Connection refused - remote service may be down");
      }
    }
  }
}

async function testPublicImageUrls() {
  console.log("\n🌍 PUBLIC IMAGE URL TESTS 🌍");
  console.log("============================");

  const remoteServiceUrl =
    process.env.CANVAS_EXTENSION_SERVICE_URL ||
    "https://canvas-service-public-425215.uc.r.appspot.com";

  // Test with known public image URLs as fallback
  const publicTestUrls = [
    "https://picsum.photos/800/600.jpg",
    "https://via.placeholder.com/800x600.jpg",
  ];

  for (const testUrl of publicTestUrls) {
    console.log(`\n🔍 Testing public URL: ${testUrl}`);

    try {
      const response = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: testUrl,
          desiredHeight: 800,
          paddingPct: 0.05,
          whiteThresh: 90,
        }),
        timeout: 30000,
      });

      console.log(`📥 Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ SUCCESS with public URL!");
        console.log("📊 This confirms remote service is working");
      } else {
        const errorText = await response.text();
        console.log("❌ Failed with public URL:", errorText);
      }
    } catch (error) {
      console.log("❌ Request failed:", error.message);
    }
  }
}

// Main test runner
async function runRemoteServiceTests() {
  console.log("🧪 CANVAS EXTENSION REMOTE SERVICE TESTS 🧪");
  console.log("===========================================");
  console.log(`🕒 Started at: ${new Date().toISOString()}`);

  try {
    // Step 1: Check remote service health
    const isHealthy = await testRemoteServiceHealth();
    if (!isHealthy) {
      console.log("❌ Remote service is not healthy, skipping further tests");
      return;
    }

    // Step 2: Test Cloudflare image accessibility
    await testCloudflareImageAccess();

    // Step 3: Test remote service with Cloudflare URLs
    await testRemoteServiceWithCloudflareUrls();

    // Step 4: Test with public URLs as baseline
    await testPublicImageUrls();

    console.log("\n🎉 All tests completed!");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runRemoteServiceTests();
}

module.exports = {
  testRemoteServiceHealth,
  testCloudflareImageAccess,
  testRemoteServiceWithCloudflareUrls,
  testPublicImageUrls,
  runRemoteServiceTests,
};
