const fetch = require("node-fetch");

// Test our URL transformation logic
function testCloudflareUrlTransformation() {
  console.log("🔍 TESTING OUR IMAGE API URL TRANSFORMATION 🔍");
  console.log("================================================");

  // Simulate what our image API does for URL transformation
  function getEnhancedImageUrl(baseUrl, width, quality) {
    let params = [];
    if (width && width.trim() !== "") params.push(`w=${width}`);
    if (quality && quality.trim() !== "") params.push(`q=${quality}`);

    if (params.length === 0) return baseUrl;

    // Handle different Cloudflare URL formats (copied from our codebase)
    if (baseUrl.includes("imagedelivery.net")) {
      // Check if URL already has transformations (contains variant like 'public')
      if (baseUrl.endsWith("/public") || baseUrl.match(/\/[a-zA-Z]+$/)) {
        // Replace the last segment (usually 'public') with our parameters
        const urlParts = baseUrl.split("/");
        urlParts[urlParts.length - 1] = params.join(",");
        return urlParts.join("/");
      } else {
        // URL doesn't have a variant, append transformations
        return `${baseUrl}/${params.join(",")}`;
      }
    }

    // Fallback for other URL formats
    return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  }

  function fixCloudflareImageUrl(url) {
    if (!url || url.trim() === "") {
      return "https://placehold.co/600x400?text=No+Image";
    }

    // If it's a Cloudflare URL and doesn't have a variant, add /public
    if (
      url.includes("imagedelivery.net") &&
      !url.includes("/public") &&
      !url.includes("/thumbnail")
    ) {
      return `${url}/public`;
    } else {
      return url;
    }
  }

  // Test with different base URLs found in our system
  const testCases = [
    {
      name: "Standard database URL (no variant)",
      baseUrl:
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269",
      expectedFixed:
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/public",
      expectedHighRes:
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/w=3000,q=95",
    },
    {
      name: "URL with /public variant",
      baseUrl:
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/public",
      expectedFixed:
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/public",
      expectedHighRes:
        "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/6836113cc9e41446df959269/w=3000,q=95",
    },
    {
      name: "Test account URL (4DHLZ...)",
      baseUrl:
        "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269",
      expectedFixed:
        "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public",
      expectedHighRes:
        "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=3000,q=95",
    },
  ];

  const generatedUrls = [];

  testCases.forEach((testCase) => {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📤 Base URL: ${testCase.baseUrl}`);

    // Step 1: Fix URL (add /public if needed)
    const fixedUrl = fixCloudflareImageUrl(testCase.baseUrl);
    console.log(`🔧 Fixed URL: ${fixedUrl}`);
    console.log(`✅ Matches expected: ${fixedUrl === testCase.expectedFixed}`);

    // Step 2: Generate high-resolution URL
    const highResUrl = getEnhancedImageUrl(fixedUrl, "3000", "95");
    console.log(`🎯 High-res URL: ${highResUrl}`);
    console.log(
      `✅ Matches expected: ${highResUrl === testCase.expectedHighRes}`
    );

    // Step 3: Generate medium-resolution URL
    const mediumResUrl = getEnhancedImageUrl(fixedUrl, "1080", "90");
    console.log(`📊 Medium-res URL: ${mediumResUrl}`);

    generatedUrls.push({
      name: testCase.name,
      fixed: fixedUrl,
      highRes: highResUrl,
      mediumRes: mediumResUrl,
    });
  });

  return generatedUrls;
}

async function testGeneratedUrlAccessibility(generatedUrls) {
  console.log("\n🌐 TESTING GENERATED URL ACCESSIBILITY 🌐");
  console.log("==========================================");

  const accessibleUrls = [];

  for (const urlSet of generatedUrls) {
    console.log(`\n🔍 Testing URLs for: ${urlSet.name}`);

    const urlsToTest = [
      { type: "Fixed (public)", url: urlSet.fixed },
      { type: "High-res", url: urlSet.highRes },
      { type: "Medium-res", url: urlSet.mediumRes },
    ];

    for (const test of urlsToTest) {
      console.log(`\n  📤 ${test.type}: ${test.url}`);

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

        if (
          response.ok &&
          response.headers.get("content-type")?.includes("image")
        ) {
          console.log(`  ✅ ACCESSIBLE!`);
          accessibleUrls.push({
            type: test.type,
            url: test.url,
            urlSet: urlSet.name,
          });
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

  console.log(
    `\n📊 Summary: ${accessibleUrls.length} URLs are publicly accessible`
  );

  if (accessibleUrls.length > 0) {
    console.log("\n✅ Accessible URLs found:");
    accessibleUrls.forEach((item) => {
      console.log(`   ${item.type} (${item.urlSet}): ${item.url}`);
    });
  }

  return accessibleUrls;
}

async function testRemoteServiceWithOurUrls(accessibleUrls) {
  console.log("\n🚀 TESTING REMOTE SERVICE WITH OUR IMAGE API URLS 🚀");
  console.log("=====================================================");

  if (accessibleUrls.length === 0) {
    console.log("❌ No accessible URLs from our image API to test");
    return false;
  }

  const remoteServiceUrl =
    process.env.CANVAS_EXTENSION_SERVICE_URL ||
    "https://canvas-service-public-s6vo3k273a-uc.a.run.app";

  console.log(`🔗 Testing with remote service: ${remoteServiceUrl}`);

  // Test with the first few accessible URLs
  const urlsToTest = accessibleUrls.slice(0, 3); // Test first 3

  for (const urlTest of urlsToTest) {
    console.log(`\n🧪 Testing ${urlTest.type} URL with remote service:`);
    console.log(`📤 URL: ${urlTest.url}`);

    try {
      const startTime = Date.now();
      const response = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: urlTest.url,
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
        console.log("🎉 SUCCESS! Our image API URLs work with remote service!");
        console.log("📊 Result keys:", Object.keys(result));
        console.log("📊 Has processedImageUrl:", !!result.processedImageUrl);

        if (result.processedImageUrl) {
          const base64Length = result.processedImageUrl.length;
          console.log(`📊 Base64 image length: ${base64Length} characters`);
          console.log(
            `📊 Estimated size: ~${Math.round((base64Length * 0.75) / 1024)}KB`
          );
        }

        return true; // Found working solution!
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

async function runImageApiTests() {
  console.log("🧪 TESTING OUR IMAGE API URL GENERATION 🧪");
  console.log("==========================================");
  console.log(`🕒 Started at: ${new Date().toISOString()}`);

  try {
    // Step 1: Test our URL transformation logic
    const generatedUrls = testCloudflareUrlTransformation();

    // Step 2: Test if our generated URLs are accessible
    const accessibleUrls = await testGeneratedUrlAccessibility(generatedUrls);

    // Step 3: Test remote service with accessible URLs
    const remoteWorked = await testRemoteServiceWithOurUrls(accessibleUrls);

    console.log("\n🎯 CONCLUSIONS:");
    console.log("===============");

    if (accessibleUrls.length > 0) {
      console.log(
        "✅ Our image API can generate publicly accessible Cloudflare URLs!"
      );
      console.log(`✅ Found ${accessibleUrls.length} working URL formats`);
    } else {
      console.log("❌ Our image API URLs are not publicly accessible");
    }

    if (remoteWorked) {
      console.log("🎉 Remote service works with our image API URLs!");
      console.log(
        "💡 Solution: Use our image API URL transformation in canvas extension"
      );
    } else {
      console.log("❌ Remote service doesn't work with our URLs");
    }

    console.log("\n🎉 All tests completed!");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runImageApiTests();
}

module.exports = {
  testCloudflareUrlTransformation,
  testGeneratedUrlAccessibility,
  testRemoteServiceWithOurUrls,
  runImageApiTests,
};
