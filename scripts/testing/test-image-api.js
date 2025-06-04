// Simple test to check image API endpoint
async function testImageAPI() {
  try {
    console.log("🧪 Testing image API endpoint...");

    // Test with a known image ID (we'll need to get this from the database)
    const testImageId = "507f1f77bcf86cd799439011"; // Example ObjectId

    const response = await fetch(
      `http://localhost:3000/api/images/${testImageId}`
    );

    console.log(`📡 Response status: ${response.status}`);
    console.log(
      `📡 Response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Image API response:", data);
    } else {
      const errorData = await response.text();
      console.log("❌ Image API error:", errorData);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testImageAPI();
