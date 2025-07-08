const https = require("https");
const http = require("http");

// Configuration
const TEST_URL =
  "http://localhost:3000/cars/684c695c4fe4b497c46f95b2?image=684c73796a45a1f970bd2689&page=7";
const API_ENDPOINT =
  "http://localhost:3000/api/cars/684c695c4fe4b497c46f95b2/images?limit=25&skip=261";

console.log("🔧 Testing Infinite Loop Fix");
console.log("===========================");

// Test function to make a request with timeout
function testRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;

    const request = client.get(url, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: data,
          size: data.length,
        });
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    // Set timeout to detect hanging requests
    request.setTimeout(timeout, () => {
      request.destroy();
      reject(
        new Error(`Request timeout after ${timeout}ms - likely infinite loop`)
      );
    });
  });
}

async function runTests() {
  console.log(
    `⏱️ Testing with ${5000}ms timeout (should complete quickly if fixed)`
  );
  console.log("");

  // Test 1: API endpoint directly
  console.log("Test 1: API Endpoint");
  console.log(`URL: ${API_ENDPOINT}`);
  try {
    const start = Date.now();
    const result = await testRequest(API_ENDPOINT);
    const duration = Date.now() - start;

    console.log(`✅ Success in ${duration}ms`);
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Response size: ${result.size} bytes`);

    // Check if it's a valid JSON response
    try {
      const json = JSON.parse(result.body);
      console.log(`   Images returned: ${json.images?.length || 0}`);
      console.log(`   Total images: ${json.pagination?.totalImages || "N/A"}`);
      console.log(`   Current page: ${json.pagination?.currentPage || "N/A"}`);
    } catch (e) {
      console.log(`   Response appears to be HTML (not JSON API)`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
  }

  console.log("");

  // Test 2: Full page URL
  console.log("Test 2: Full Page URL");
  console.log(`URL: ${TEST_URL}`);
  try {
    const start = Date.now();
    const result = await testRequest(TEST_URL);
    const duration = Date.now() - start;

    console.log(`✅ Success in ${duration}ms`);
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Response size: ${result.size} bytes`);
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
  }

  console.log("");
  console.log("🎯 Test Results Summary:");
  console.log(
    "- If both tests complete quickly (< 1 second), the infinite loop is fixed"
  );
  console.log("- If tests timeout, the infinite loop issue may still exist");
  console.log("- Check browser dev tools Network tab for repeated requests");
  console.log("");
  console.log("💡 Additional checks:");
  console.log("1. Visit the URL in your browser and check Network tab");
  console.log("2. Look for repeated GET requests to the images API");
  console.log("3. Monitor MongoDB connection count");
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testRequest, runTests };
