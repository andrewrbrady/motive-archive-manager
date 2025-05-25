import { GoogleAuth } from "google-auth-library";

async function testCloudRunAuth() {
  const serviceUrl = "https://canvas-service-public-s6vo3k273a-uc.a.run.app";

  try {
    console.log("Testing Cloud Run authentication...");

    // Get an identity token for the service
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    console.log("Getting identity token...");
    const client = await auth.getIdTokenClient(serviceUrl);
    const idToken = await client.idTokenProvider.fetchIdToken(serviceUrl);

    console.log("✓ Got identity token, testing health endpoint...");

    const response = await fetch(`${serviceUrl}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    console.log("Response status:", response.status);
    const text = await response.text();
    console.log("Response body:", text);

    if (response.ok) {
      console.log("✅ Authentication successful!");
    } else {
      console.log("❌ Authentication failed");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testCloudRunAuth();
