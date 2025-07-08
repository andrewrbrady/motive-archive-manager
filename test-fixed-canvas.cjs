const fetch = require("node-fetch");

async function testFixedCanvas() {
  console.log("🧪 TESTING FIXED CANVAS EXTENSION 🧪");

  // Test with a real Cloudflare image like the crop tool uses
  const testPayload = {
    imageUrl:
      "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=1080",
    desiredHeight: 1350,
    paddingPct: 0.05,
    whiteThresh: 90,
    uploadToCloudflare: false,
    scaleMultiplier: 1,
  };

  console.log("📤 Testing canvas extension with Cloudflare image:");
  console.log(JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(
      "http://localhost:3000/api/images/extend-canvas",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      }
    );

    console.log(`📥 Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ SUCCESS!");
      console.log("📊 Has processedImageUrl:", !!result.processedImageUrl);
      console.log("📊 Success:", result.success);
      console.log("📊 Message:", result.message);
      console.log("📊 Remote service used:", result.remoteServiceUsed);
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

async function test2xScaling() {
  console.log("\n🧪 TESTING 2X SCALING (NO DOUBLE SCALING) 🧪");

  const testPayload = {
    imageUrl:
      "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=1080",
    desiredHeight: 2700, // Pre-scaled by frontend (1350 * 2)
    paddingPct: 0.05,
    whiteThresh: 90,
    uploadToCloudflare: false,
    scaleMultiplier: 2, // This should NOT scale again, only used for filename
  };

  console.log("📤 Testing 2x scaling (should use desiredHeight as-is):");
  console.log(JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(
      "http://localhost:3000/api/images/extend-canvas",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      }
    );

    console.log(`📥 Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ SUCCESS!");
      console.log("📊 Has processedImageUrl:", !!result.processedImageUrl);
      console.log("📊 Success:", result.success);
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

async function runTests() {
  await testFixedCanvas();
  await test2xScaling();
}

runTests();
