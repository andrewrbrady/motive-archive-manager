const fetch = require("node-fetch");

async function testWithPublicImage() {
  console.log("🧪 TESTING WITH PUBLIC IMAGE URL 🧪");

  // Use a publicly accessible test image
  const testPayload = {
    imageUrl: "https://picsum.photos/1080/768.jpg", // Public test image
    desiredHeight: 1350,
    paddingPct: 0.05,
    whiteThresh: 90,
    uploadToCloudflare: false,
    scaleMultiplier: 1,
  };

  console.log(
    "📤 Testing with public image:",
    JSON.stringify(testPayload, null, 2)
  );

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

async function testImageAccess() {
  console.log("\n🔗 TESTING IMAGE ACCESS 🔗");

  const testUrls = [
    "https://picsum.photos/1080/768.jpg",
    "https://imagedelivery.net/4DHLZ9gAsHJTu-GmBnrhqw/6836113cc9e41446df959269/public",
  ];

  for (const url of testUrls) {
    console.log(`\n🔍 Testing: ${url}`);
    try {
      const response = await fetch(url, { method: "HEAD" });
      console.log(`📥 Status: ${response.status} ${response.statusText}`);
      if (response.ok) {
        console.log("✅ Image is accessible");
      } else {
        console.log("❌ Image is not accessible");
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

async function runTests() {
  await testImageAccess();
  await testWithPublicImage();
}

runTests();
