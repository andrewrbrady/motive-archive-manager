const fetch = require("node-fetch");

async function testFlexibleVariantsEnabled() {
  console.log("🔍 TESTING FLEXIBLE VARIANTS CONFIGURATION 🔍");
  console.log("=============================================");

  // Test with a known working public image service first
  console.log("\n📋 Step 1: Test with known public image service");
  const publicTestUrl = "https://picsum.photos/800/600";

  try {
    const response = await fetch(publicTestUrl, { method: "HEAD" });
    console.log(
      `✅ Public test image: ${response.status} ${response.statusText}`
    );
  } catch (error) {
    console.log(`❌ Public test failed: ${error.message}`);
  }

  // Test URLs that should work if flexible variants are properly configured
  console.log("\n📋 Step 2: Test Cloudflare account configuration");

  const accountHash = "veo1agD2ekS5yYAVWyZXBA";

  // Use different image IDs to test if it's an image-specific issue
  const testImageIds = [
    "6836113cc9e41446df959269", // From our test data
    "6b46d5c0-bf1c-48e4-92d3-cd0a16d3e700", // From canvas modal
  ];

  for (const imageId of testImageIds) {
    console.log(`\n🧪 Testing image ID: ${imageId}`);

    const testUrls = [
      {
        name: "Base URL (should require variant)",
        url: `https://imagedelivery.net/${accountHash}/${imageId}`,
        expectedStatus: "400 Bad Request",
      },
      {
        name: "Named variant (/public)",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/public`,
        expectedStatus: "200 OK or 403/404",
      },
      {
        name: "Named variant (/thumbnail)",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/thumbnail`,
        expectedStatus: "200 OK or 403/404",
      },
      {
        name: "Flexible variant (w=100)",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/w=100`,
        expectedStatus: "200 OK if flexible variants enabled",
      },
      {
        name: "Flexible variant (w=3000,q=95)",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/w=3000,q=95`,
        expectedStatus: "200 OK if flexible variants enabled",
      },
    ];

    for (const test of testUrls) {
      console.log(`\n  📤 ${test.name}:`);
      console.log(`     ${test.url}`);

      try {
        const response = await fetch(test.url, {
          method: "HEAD",
          timeout: 10000,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Flexible Variants Test)",
          },
        });

        const status = `${response.status} ${response.statusText}`;
        console.log(`  📥 Status: ${status}`);

        if (response.headers.get("content-type")) {
          console.log(
            `  📊 Content-Type: ${response.headers.get("content-type")}`
          );
        }

        if (response.headers.get("cf-ray")) {
          console.log(
            `  ☁️ Cloudflare Ray ID: ${response.headers.get("cf-ray")}`
          );
        }

        // Analyze the result
        if (test.name.includes("Flexible variant")) {
          if (response.status === 200) {
            console.log(`  ✅ FLEXIBLE VARIANTS ARE ENABLED!`);
          } else if (response.status === 400) {
            console.log(
              `  ❌ Flexible variants likely disabled (400 Bad Request)`
            );
          } else if (response.status === 403) {
            console.log(`  ❌ Image requires signed URLs (403 Forbidden)`);
          } else if (response.status === 404) {
            console.log(`  ❌ Image doesn't exist (404 Not Found)`);
          }
        } else if (test.name.includes("Named variant")) {
          if (response.status === 200) {
            console.log(`  ✅ Image is publicly accessible!`);
          } else if (response.status === 403) {
            console.log(`  ❌ Image requires signed URLs`);
          } else if (response.status === 404) {
            console.log(`  ❌ Image doesn't exist or variant not found`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Network error: ${error.message}`);
      }
    }
  }

  console.log("\n📋 Step 3: Test with our own uploaded image");

  // Test if we can upload an image and immediately check if it's publicly accessible
  const testImageUpload = await testImageUploadAndAccess();

  console.log("\n🎯 CONCLUSIONS:");
  console.log("===============");

  console.log("Based on the test results:");
  console.log(
    "1. If flexible variants work (w=100 returns 200): ✅ Account supports flexible variants"
  );
  console.log(
    "2. If flexible variants fail (w=100 returns 400): ❌ Flexible variants disabled"
  );
  console.log("3. If named variants fail (403): ❌ Images require signed URLs");
  console.log(
    "4. If named variants work (200): ✅ Images are publicly accessible"
  );

  console.log("\n💡 NEXT STEPS:");
  if (testImageUpload) {
    console.log("✅ Test upload worked - check Cloudflare dashboard settings");
  } else {
    console.log("❌ Upload test failed - check API credentials");
  }
  console.log(
    "📝 Check Cloudflare dashboard > Images > Settings > Flexible variants"
  );
  console.log("📝 Ensure account has flexible variants enabled");
  console.log("📝 Verify existing images have requireSignedURLs: false");
}

async function testImageUploadAndAccess() {
  console.log("🔄 Testing image upload and immediate access...");

  try {
    // Create a simple test image via our API (if API is running)
    const testResponse = await fetch(
      "http://localhost:3000/api/cloudflare/images/test",
      {
        method: "GET",
        timeout: 5000,
      }
    );

    if (testResponse.ok) {
      console.log("✅ API is accessible for testing");
      return true;
    } else {
      console.log("❌ API not accessible (probably not running)");
      return false;
    }
  } catch (error) {
    console.log("❌ Could not test upload:", error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testFlexibleVariantsEnabled().catch((error) => {
    console.error("❌ Test failed:", error);
  });
}

module.exports = { testFlexibleVariantsEnabled };
