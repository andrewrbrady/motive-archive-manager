const fetch = require("node-fetch");

async function testPublicWithParameters() {
  console.log("🔍 TESTING /public WITH PARAMETERS 🔍");
  console.log("====================================");

  const accountHash = "veo1agD2ekS5yYAVWyZXBA";

  // Test with the image IDs we found
  const testImageIds = [
    "6836113cc9e41446df959269",
    "6b46d5c0-bf1c-48e4-92d3-cd0a16d3e700",
  ];

  for (const imageId of testImageIds) {
    console.log(`\n🧪 Testing image ID: ${imageId}`);

    // Test different parameter formats with /public
    const testUrls = [
      {
        name: "Standard /public",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/public`,
      },
      {
        name: "/public with w=3000,q=100",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/public/w=3000,q=100`,
      },
      {
        name: "/public?w=3000&q=100 (query params)",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/public?w=3000&q=100`,
      },
      {
        name: "Direct w=3000,q=100 (flexible)",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/w=3000,q=100`,
      },
      {
        name: "/public with w=1080,q=90",
        url: `https://imagedelivery.net/${accountHash}/${imageId}/public/w=1080,q=90`,
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
            "User-Agent": "Mozilla/5.0 (compatible; Public Params Test)",
          },
        });

        const status = `${response.status} ${response.statusText}`;
        console.log(`  📥 Status: ${status}`);

        if (response.headers.get("content-type")) {
          console.log(
            `  📊 Content-Type: ${response.headers.get("content-type")}`
          );
        }

        if (response.status === 200) {
          console.log(`  ✅ SUCCESS! This format works!`);

          // Test with remote service if this URL works
          if (response.headers.get("content-type")?.includes("image")) {
            console.log(`  🚀 Testing with remote service...`);
            await testWithRemoteService(test.url);
          }
        } else if (response.status === 403) {
          console.log(`  ❌ 403 Forbidden - Authentication required`);
        } else if (response.status === 404) {
          console.log(`  ❌ 404 Not Found - Image doesn't exist or bad format`);
        } else if (response.status === 400) {
          console.log(`  ❌ 400 Bad Request - Invalid format`);
        }
      } catch (error) {
        console.log(`  ❌ Network error: ${error.message}`);
      }
    }
  }

  console.log("\n🎯 CONCLUSIONS:");
  console.log("===============");
  console.log("If we find a working format, we can:");
  console.log("1. ✅ Use our existing image API transformation logic");
  console.log("2. ✅ Generate high-quality URLs with w=3000,q=100");
  console.log("3. ✅ Make them accessible to the remote service");
  console.log("4. ✅ Fix canvas extension with minimal changes");
}

async function testWithRemoteService(imageUrl) {
  const remoteServiceUrl =
    process.env.CANVAS_EXTENSION_SERVICE_URL ||
    "https://canvas-service-public-s6vo3k273a-uc.a.run.app";

  console.log(`    🔗 Remote Service: ${remoteServiceUrl}`);

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
      timeout: 15000,
    });

    console.log(
      `    📥 Remote Status: ${response.status} ${response.statusText}`
    );

    if (response.ok) {
      console.log(`    🎉 REMOTE SERVICE WORKS WITH THIS URL!`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`    ❌ Remote failed: ${errorText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`    ❌ Remote error: ${error.message}`);
  }

  return false;
}

// Run the test
if (require.main === module) {
  testPublicWithParameters().catch((error) => {
    console.error("❌ Test failed:", error);
  });
}

module.exports = { testPublicWithParameters };
