const fetch = require("node-fetch");

async function testFix() {
  console.log("🧪 TESTING CANVAS EXTENSION FIXES 🧪");

  const testPayload = {
    imageUrl:
      "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/w=1080",
    desiredHeight: 1350, // Original size - no frontend scaling for this test
    paddingPct: 0.05,
    whiteThresh: 90,
    uploadToCloudflare: false,
    scaleMultiplier: 1,
  };

  console.log("📤 Testing with payload:", JSON.stringify(testPayload, null, 2));

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

testFix();
