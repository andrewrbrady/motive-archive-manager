const fetch = require("node-fetch");

async function testRealCloudflareImageFromCodebase() {
  console.log("🔍 TESTING REAL CLOUDFLARE IMAGE FROM CODEBASE 🔍");
  console.log("================================================");

  // Real image ID found in the codebase
  const realImageId = "6b46d5c0-bf1c-48e4-92d3-cd0a16d3e700";
  const accountHashes = [
    "veo1agD2ekS5yYAVWyZXBA", // Real production account
    "DPuFizKWBZCkvs8FG_hh3A", // Found in canvas extension modal
    "4DHLZ9gAsHJTu-GmBnrhqw", // Test account
  ];

  // Our image API URL transformation logic
  function getEnhancedImageUrl(baseUrl, width, quality) {
    let params = [];
    if (width && width.trim() !== "") params.push(`w=${width}`);
    if (quality && quality.trim() !== "") params.push(`q=${quality}`);

    if (params.length === 0) return baseUrl;

    if (baseUrl.includes("imagedelivery.net")) {
      if (baseUrl.endsWith("/public") || baseUrl.match(/\/[a-zA-Z]+$/)) {
        const urlParts = baseUrl.split("/");
        urlParts[urlParts.length - 1] = params.join(",");
        return urlParts.join("/");
      } else {
        return `${baseUrl}/${params.join(",")}`;
      }
    }

    return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  }

  const accessibleUrls = [];

  // Test each account hash with the real image ID
  for (const accountHash of accountHashes) {
    console.log(`\n🧪 Testing account hash: ${accountHash}`);

    const baseUrl = `https://imagedelivery.net/${accountHash}/${realImageId}`;
    const publicUrl = `${baseUrl}/public`;
    const highResUrl = getEnhancedImageUrl(publicUrl, "3000", "95");
    const mediumResUrl = getEnhancedImageUrl(publicUrl, "1080", "90");

    const urlsToTest = [
      { name: "Base URL", url: baseUrl },
      { name: "Public URL", url: publicUrl },
      { name: "High-res URL", url: highResUrl },
      { name: "Medium-res URL", url: mediumResUrl },
    ];

    for (const test of urlsToTest) {
      console.log(`\n  📤 ${test.name}: ${test.url}`);

      try {
        const response = await fetch(test.url, {
          method: "HEAD",
          timeout: 10000,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Canvas Extension Test)",
            Accept: "image/*",
          },
        });

        console.log(`  📥 Status: ${response.status} ${response.statusText}`);

        if (response.headers.get("content-type")) {
          console.log(
            `  📊 Content-Type: ${response.headers.get("content-type")}`
          );
        }

        if (response.headers.get("content-length")) {
          console.log(
            `  📊 Size: ${response.headers.get("content-length")} bytes`
          );
        }

        if (
          response.ok &&
          response.headers.get("content-type")?.includes("image")
        ) {
          console.log(`  ✅ ACCESSIBLE! This URL works!`);
          accessibleUrls.push(test.url);
        } else if (response.status === 403) {
          console.log(`  ❌ 403 Forbidden - Authentication required`);
        } else if (response.status === 404) {
          console.log(`  ❌ 404 Not Found - Image doesn't exist`);
        } else {
          console.log(`  ❌ Not accessible`);
        }
      } catch (error) {
        console.log(`  ❌ Network error: ${error.message}`);
      }
    }
  }

  console.log(`\n📊 SUMMARY: Found ${accessibleUrls.length} accessible URLs`);

  if (accessibleUrls.length > 0) {
    console.log("\n✅ ACCESSIBLE URLS:");
    accessibleUrls.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });

    // Test the first accessible URL with remote service
    await testWithRemoteService(accessibleUrls[0]);
  } else {
    console.log("\n❌ No publicly accessible Cloudflare URLs found");
    console.log(
      "💡 This confirms that Cloudflare images require authentication"
    );
  }

  return accessibleUrls;
}

async function testWithRemoteService(imageUrl) {
  console.log("\n🚀 TESTING WITH REMOTE SERVICE 🚀");
  console.log("=================================");

  const remoteServiceUrl =
    process.env.CANVAS_EXTENSION_SERVICE_URL ||
    "https://canvas-service-public-s6vo3k273a-uc.a.run.app";

  console.log(`🔗 Remote Service: ${remoteServiceUrl}`);
  console.log(`📤 Image URL: ${imageUrl}`);

  try {
    const startTime = Date.now();
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

    const duration = Date.now() - startTime;
    console.log(
      `📥 Remote Service Status: ${response.status} ${response.statusText} (${duration}ms)`
    );

    if (response.ok) {
      const result = await response.json();
      console.log("🎉 SUCCESS! Remote service worked!");
      console.log("📊 Result keys:", Object.keys(result));

      if (result.processedImageUrl) {
        console.log("✅ Got processed image back!");
        const base64Length = result.processedImageUrl.length;
        console.log(`📊 Base64 length: ${base64Length} characters`);
      }

      return true;
    } else {
      const errorText = await response.text();
      console.log("❌ Remote service failed:", errorText);
      return false;
    }
  } catch (error) {
    console.log("❌ Request failed:", error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testRealCloudflareImageFromCodebase()
    .then((accessibleUrls) => {
      console.log("\n🎯 FINAL CONCLUSION:");
      console.log("===================");

      if (accessibleUrls.length > 0) {
        console.log("✅ Found working Cloudflare URLs!");
        console.log(
          "💡 Our image API can generate accessible high-quality URLs"
        );
        console.log(
          "💡 Solution: Use our URL transformation in canvas extension"
        );
      } else {
        console.log("❌ NO publicly accessible Cloudflare URLs found");
        console.log("💡 All Cloudflare images require authentication");
        console.log("💡 Need to download images locally and proxy them");
      }
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
    });
}

module.exports = { testRealCloudflareImageFromCodebase };
