import { GoogleAuth } from "google-auth-library";

async function testCanvasExtension() {
  const serviceUrl = "https://canvas-service-public-s6vo3k273a-uc.a.run.app";

  try {
    console.log("Testing Canvas Extension with real image...");

    // Get an identity token for the service
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    console.log("Getting identity token...");
    const client = await auth.getIdTokenClient(serviceUrl);
    const idToken = await client.idTokenProvider.fetchIdToken(serviceUrl);

    console.log("✓ Got identity token, testing canvas extension...");

    // Test with a publicly accessible car image
    const testImageUrl =
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop";

    const response = await fetch(`${serviceUrl}/extend-canvas`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: testImageUrl,
        desiredHeight: 800,
        paddingPct: 0.1,
        whiteThresh: 240,
      }),
    });

    console.log("Response status:", response.status);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Canvas extension successful!");
      console.log("Result:", {
        success: result.success,
        hasProcessedImage: !!result.processedImageUrl,
        message: result.message,
      });

      if (result.processedImageUrl) {
        console.log(
          "📸 Processed image URL length:",
          result.processedImageUrl.length
        );
        console.log(
          "📸 Image format:",
          result.processedImageUrl.substring(0, 50) + "..."
        );
      }
    } else {
      const errorText = await response.text();
      console.log("❌ Canvas extension failed");
      console.log("Error:", errorText);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testCanvasExtension();
