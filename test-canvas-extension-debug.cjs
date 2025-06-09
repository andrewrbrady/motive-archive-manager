const fetch = require("node-fetch");

async function testCanvasExtensionAPI() {
  console.log("🧪 CANVAS EXTENSION DEBUG TESTS 🧪");
  console.log("=====================================");

  const baseUrl = "http://localhost:3000";

  // Test image URL - using a known working Cloudflare image
  const testImageUrl =
    "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public";

  // Test cases
  const testCases = [
    {
      name: "Basic Canvas Extension (1x scale)",
      payload: {
        imageUrl: testImageUrl,
        desiredHeight: 1350,
        paddingPct: 0.05,
        whiteThresh: 90,
        uploadToCloudflare: false,
        scaleMultiplier: 1,
      },
    },
    {
      name: "Canvas Extension with 2x scale (PROBLEMATIC)",
      payload: {
        imageUrl: testImageUrl,
        desiredHeight: 1350,
        paddingPct: 0.05,
        whiteThresh: 90,
        uploadToCloudflare: false,
        scaleMultiplier: 2,
      },
    },
    {
      name: "Canvas Extension for Gallery Replace (via unified API)",
      endpoint: "/api/images/process",
      payload: {
        imageId: "6836113cc9e41446df959269",
        processingType: "canvas-extension",
        parameters: {
          imageUrl: testImageUrl,
          desiredHeight: "1350",
          paddingPercentage: "0.05",
          whiteThreshold: "90",
          outputWidth: "1080",
          originalFilename: "test-image.jpg",
          originalCarId: null,
          scaleMultiplier: 2,
          previewImageDimensions: { width: 1080, height: 768 },
        },
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log("=".repeat(50));

    const endpoint = testCase.endpoint || "/api/images/extend-canvas";

    try {
      console.log(`📤 Request to ${endpoint}:`);
      console.log(JSON.stringify(testCase.payload, null, 2));

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testCase.payload),
      });

      console.log(
        `📥 Response Status: ${response.status} ${response.statusText}`
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ SUCCESS!");
        console.log("📊 Response Keys:", Object.keys(result));
        console.log("📊 Has processedImageUrl:", !!result.processedImageUrl);
        console.log("📊 Has cloudflareUpload:", !!result.cloudflareUpload);

        if (result.cloudflareUpload) {
          console.log(
            "📊 Cloudflare Upload Keys:",
            Object.keys(result.cloudflareUpload)
          );
        }
      } else {
        const errorText = await response.text();
        console.log("❌ FAILED!");
        console.log("📊 Error Response:", errorText);

        try {
          const errorJson = JSON.parse(errorText);
          console.log("📊 Parsed Error:", JSON.stringify(errorJson, null, 2));
        } catch (e) {
          console.log("📊 Raw Error Text:", errorText);
        }
      }
    } catch (error) {
      console.log("❌ REQUEST FAILED!");
      console.log("📊 Error:", error.message);
    }
  }
}

async function testImageUrlValidation() {
  console.log("\n🔗 IMAGE URL VALIDATION TESTS 🔗");
  console.log("==================================");

  const testUrls = [
    "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public",
    "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=1080",
    "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=3000,q=95",
  ];

  for (const url of testUrls) {
    console.log(`\n🔍 Testing URL: ${url}`);
    try {
      const response = await fetch(url, { method: "HEAD" });
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      console.log(`📊 Content-Type: ${response.headers.get("content-type")}`);
      console.log(
        `📊 Content-Length: ${response.headers.get("content-length")}`
      );
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

async function testRemoteServiceDirect() {
  console.log("\n🌐 REMOTE SERVICE DIRECT TESTS 🌐");
  console.log("==================================");

  const remoteServiceUrl =
    process.env.CANVAS_EXTENSION_SERVICE_URL ||
    "https://canvas-service-public-425215.uc.r.appspot.com";

  if (!remoteServiceUrl) {
    console.log("❌ No CANVAS_EXTENSION_SERVICE_URL environment variable");
    return;
  }

  console.log(`🔗 Remote Service URL: ${remoteServiceUrl}`);

  const testPayloads = [
    {
      name: "Original dimensions (working baseline)",
      payload: {
        imageUrl:
          "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public",
        desiredHeight: 1350,
        paddingPct: 0.05,
        whiteThresh: 90,
      },
    },
    {
      name: "Scaled dimensions (2x - problematic)",
      payload: {
        imageUrl:
          "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public",
        desiredHeight: 2700, // 1350 * 2
        paddingPct: 0.05,
        whiteThresh: 90,
      },
    },
    {
      name: "High-res source URL",
      payload: {
        imageUrl:
          "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=3000,q=95",
        desiredHeight: 1350,
        paddingPct: 0.05,
        whiteThresh: 90,
      },
    },
  ];

  for (const test of testPayloads) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log("📤 Payload:", JSON.stringify(test.payload, null, 2));

    try {
      const response = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(test.payload),
      });

      console.log(`📥 Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ SUCCESS!");
        console.log("📊 Result keys:", Object.keys(result));
        console.log("📊 Has processedImageUrl:", !!result.processedImageUrl);
      } else {
        const errorText = await response.text();
        console.log("❌ FAILED!");
        console.log("📊 Error:", errorText);
      }
    } catch (error) {
      console.log("❌ REQUEST FAILED!");
      console.log("📊 Error:", error.message);
    }
  }
}

async function testParameterPassing() {
  console.log("\n📝 PARAMETER PASSING TESTS 📝");
  console.log("==============================");

  // Test what parameters are actually being sent through the chain
  const testData = {
    original: {
      desiredHeight: "1350",
      outputWidth: "1080",
      paddingPercentage: "0.05",
      whiteThreshold: "90",
    },
    scale: 2,
  };

  console.log("🔍 Original parameters:", testData.original);
  console.log("🔍 Scale factor:", testData.scale);

  // Simulate frontend scaling logic
  const scaledParameters = {
    ...testData.original,
    scale: testData.scale,
    outputWidth:
      testData.scale > 1
        ? String(
            parseInt(testData.original.outputWidth || "1080") * testData.scale
          )
        : testData.original.outputWidth,
    desiredHeight:
      testData.scale > 1
        ? String(
            parseInt(testData.original.desiredHeight || "1350") * testData.scale
          )
        : testData.original.desiredHeight,
    scaleMultiplier: testData.scale,
  };

  console.log("🔍 Scaled parameters (frontend):", scaledParameters);

  // Simulate unified API processing
  const unifiedAPIPayload = {
    imageUrl:
      "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public",
    desiredHeight: parseInt(scaledParameters.desiredHeight) || 1350,
    paddingPct: parseFloat(scaledParameters.paddingPercentage) || 0.05,
    whiteThresh: parseInt(scaledParameters.whiteThreshold) || 90,
    uploadToCloudflare: true,
    requestedWidth: parseInt(scaledParameters.outputWidth) || 1080,
    requestedHeight: parseInt(scaledParameters.desiredHeight) || 1350,
    scaleMultiplier: scaledParameters.scaleMultiplier || 1,
  };

  console.log("🔍 Unified API payload:", unifiedAPIPayload);

  // Simulate canvas extension API processing
  const finalDesiredHeight =
    unifiedAPIPayload.scaleMultiplier && unifiedAPIPayload.scaleMultiplier > 1
      ? Math.round(
          unifiedAPIPayload.desiredHeight * unifiedAPIPayload.scaleMultiplier
        )
      : unifiedAPIPayload.desiredHeight;

  console.log("🔍 Final desired height calculation:");
  console.log(`   Original desiredHeight: ${unifiedAPIPayload.desiredHeight}`);
  console.log(`   Scale multiplier: ${unifiedAPIPayload.scaleMultiplier}`);
  console.log(`   Final desired height: ${finalDesiredHeight}`);

  if (finalDesiredHeight > 3000) {
    console.log(
      "⚠️  WARNING: Final height is very large, might cause remote service failure!"
    );
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testParameterPassing();
    await testImageUrlValidation();
    await testRemoteServiceDirect();
    await testCanvasExtensionAPI();
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testCanvasExtensionAPI,
  testImageUrlValidation,
  testRemoteServiceDirect,
  testParameterPassing,
  runAllTests,
};
