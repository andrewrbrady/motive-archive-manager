const fetch = require("node-fetch");

async function testRealCloudflareUrls() {
  console.log("🔍 TESTING REAL CLOUDFLARE URLS FROM CODEBASE 🔍");
  console.log("=================================================");

  // URLs found in the codebase
  const urlsToTest = [
    {
      name: "Canvas Extension Modal Test URL",
      url: "https://imagedelivery.net/DPuFizKWBZCkvs8FG_hh3A/6b46d5c0-bf1c-48e4-92d3-cd0a16d3e700/public",
    },
    {
      name: "Standard Test URL (4DHLZ...)",
      url: "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public",
    },
    {
      name: "Standard Test URL with w=1080",
      url: "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=1080",
    },
    {
      name: "Standard Test URL with w=3000,q=95",
      url: "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=3000,q=95",
    },
    {
      name: "Real account hash URL (veo1ag...)",
      url: "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/public",
    },
    {
      name: "Real account hash URL with transforms",
      url: "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/w=1080,q=90",
    },
  ];

  const accessibleUrls = [];

  for (const test of urlsToTest) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`📤 URL: ${test.url}`);

    try {
      const response = await fetch(test.url, {
        method: "HEAD",
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Canvas Extension Test)",
          Accept: "image/*",
        },
      });

      console.log(`📥 Status: ${response.status} ${response.statusText}`);

      if (response.headers.get("content-type")) {
        console.log(`📊 Content-Type: ${response.headers.get("content-type")}`);
      }

      if (response.headers.get("content-length")) {
        console.log(
          `📊 Content-Length: ${response.headers.get("content-length")}`
        );
      }

      if (
        response.ok &&
        response.headers.get("content-type")?.includes("image")
      ) {
        console.log("✅ Accessible!");
        accessibleUrls.push(test.url);
      } else if (response.status === 403) {
        console.log("❌ 403 Forbidden - May require authentication");
      } else if (response.status === 404) {
        console.log(
          "❌ 404 Not Found - Image doesn't exist or wrong account hash"
        );
      } else {
        console.log("❌ Not accessible or not an image");
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
  }

  console.log(
    `\n📊 Summary: ${accessibleUrls.length}/${urlsToTest.length} URLs accessible`
  );

  if (accessibleUrls.length > 0) {
    console.log("✅ Accessible URLs found:");
    accessibleUrls.forEach((url) => console.log(`   - ${url}`));
  } else {
    console.log("❌ No accessible Cloudflare URLs found");
  }

  return accessibleUrls;
}

async function testRemoteServiceWithWorking() {
  console.log("\n🌐 TESTING REMOTE SERVICE WITH WORKING URLS 🌐");
  console.log("===============================================");

  const accessibleUrls = await testRealCloudflareUrls();

  if (accessibleUrls.length === 0) {
    console.log("❌ No accessible URLs to test with remote service");
    return;
  }

  const remoteServiceUrl =
    process.env.CANVAS_EXTENSION_SERVICE_URL ||
    "https://canvas-service-public-s6vo3k273a-uc.a.run.app";

  console.log(`🔗 Testing with remote service: ${remoteServiceUrl}`);

  for (const imageUrl of accessibleUrls) {
    console.log(`\n🧪 Testing remote service with: ${imageUrl}`);

    try {
      const response = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          desiredHeight: 1350,
          paddingPct: 0.05,
          whiteThresh: 90,
        }),
        timeout: 30000,
      });

      console.log(
        `📥 Remote Service Status: ${response.status} ${response.statusText}`
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ SUCCESS with real Cloudflare URL!");
        console.log("📊 Result keys:", Object.keys(result));
        console.log("📊 Has processedImageUrl:", !!result.processedImageUrl);

        if (result.processedImageUrl) {
          const base64Length = result.processedImageUrl.length;
          console.log(`📊 Base64 image length: ${base64Length} characters`);
        }

        return true; // Found working combination
      } else {
        const errorText = await response.text();
        console.log("❌ Remote service failed:", errorText);
      }
    } catch (error) {
      console.log("❌ Request failed:", error.message);
    }
  }

  return false;
}

async function testProxyApproach() {
  console.log("\n🔄 TESTING PROXY APPROACH 🔄");
  console.log("============================");

  // Test if we can use a proxy to make Cloudflare images accessible
  const testImageUrl =
    "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public";
  const proxyUrl = `http://localhost:3000/api/proxy-image?url=${encodeURIComponent(testImageUrl)}`;

  console.log(`🔗 Testing proxy URL: ${proxyUrl}`);

  try {
    const response = await fetch(proxyUrl, {
      method: "HEAD",
      timeout: 10000,
    });

    console.log(`📥 Proxy Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      console.log("✅ Proxy approach works!");
      console.log(
        "📊 This means we can proxy Cloudflare images for remote service"
      );

      // Test with remote service using proxy URL
      const remoteServiceUrl =
        process.env.CANVAS_EXTENSION_SERVICE_URL ||
        "https://canvas-service-public-s6vo3k273a-uc.a.run.app";

      console.log(`\n🧪 Testing remote service with proxy URL...`);

      const remoteResponse = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: proxyUrl,
          desiredHeight: 1350,
          paddingPct: 0.05,
          whiteThresh: 90,
        }),
        timeout: 30000,
      });

      console.log(
        `📥 Remote with Proxy Status: ${remoteResponse.status} ${remoteResponse.statusText}`
      );

      if (remoteResponse.ok) {
        const result = await remoteResponse.json();
        console.log("🎉 SUCCESS! Remote service works with proxy approach!");
        return true;
      } else {
        const errorText = await remoteResponse.text();
        console.log("❌ Remote service failed with proxy:", errorText);
      }
    } else {
      console.log("❌ Proxy approach failed");
    }
  } catch (error) {
    console.log("❌ Proxy test failed:", error.message);
  }

  return false;
}

async function runAllCloudflareTests() {
  console.log("🧪 COMPREHENSIVE CLOUDFLARE URL TESTS 🧪");
  console.log("========================================");
  console.log(`🕒 Started at: ${new Date().toISOString()}`);

  try {
    // Step 1: Test which Cloudflare URLs are accessible
    await testRealCloudflareUrls();

    // Step 2: Test remote service with any working URLs
    const remoteWorked = await testRemoteServiceWithWorking();

    // Step 3: If remote doesn't work, test proxy approach
    if (!remoteWorked) {
      console.log(
        "\n⚠️ Direct Cloudflare URLs didn't work with remote service"
      );
      console.log("🔄 Trying proxy approach...");
      await testProxyApproach();
    }

    console.log("\n🎉 All tests completed!");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllCloudflareTests();
}

module.exports = {
  testRealCloudflareUrls,
  testRemoteServiceWithWorking,
  testProxyApproach,
  runAllCloudflareTests,
};
