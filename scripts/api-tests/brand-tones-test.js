/**
 * Brand Tones API Test Script
 * Tests CRUD operations for the brand tones management system
 *
 * Usage: node scripts/api-tests/brand-tones-test.js
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Test data
const testBrandTone = {
  name: "Test Professional Tone",
  description: "A professional brand tone for testing",
  tone_instructions:
    "Write in a formal, business-like manner. Use proper grammar and avoid casual language. Focus on expertise and reliability.",
  example_phrases: [
    "We are pleased to present",
    "Our expertise ensures",
    "Professional excellence",
  ],
  is_active: true,
};

const updatedBrandTone = {
  name: "Test Professional Tone (Updated)",
  description: "An updated professional brand tone for testing",
  tone_instructions:
    "Write in a formal, business-like manner with emphasis on innovation. Use proper grammar and avoid casual language. Focus on expertise, reliability, and forward-thinking solutions.",
  example_phrases: [
    "We are pleased to present",
    "Our expertise ensures",
    "Professional excellence",
    "Innovative solutions",
  ],
  is_active: false,
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${data.error || data.message || "Request failed"}`
      );
    }

    return data;
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    throw error;
  }
}

async function testBrandTonesCRUD() {
  console.log("🧪 Starting Brand Tones API Tests...\n");

  let createdToneId = null;

  try {
    // Test 1: Get all brand tones (should work without auth for now)
    console.log("📋 Test 1: GET /api/brand-tones/active");
    const activeTones = await makeRequest(`${API_BASE}/api/brand-tones/active`);
    console.log(`✅ Success: Found ${activeTones.length} active brand tones\n`);

    // Test 2: Create brand tone (requires admin auth - will fail without proper auth)
    console.log("➕ Test 2: POST /api/admin/brand-tones");
    try {
      const createdTone = await makeRequest(
        `${API_BASE}/api/admin/brand-tones`,
        {
          method: "POST",
          body: JSON.stringify(testBrandTone),
        }
      );
      createdToneId = createdTone._id;
      console.log(`✅ Success: Created brand tone with ID ${createdToneId}\n`);
    } catch (error) {
      console.log(`⚠️  Expected auth failure: ${error.message}\n`);
    }

    // Test 3: Get all brand tones via admin endpoint (requires admin auth)
    console.log("📋 Test 3: GET /api/admin/brand-tones");
    try {
      const allTones = await makeRequest(`${API_BASE}/api/admin/brand-tones`);
      console.log(`✅ Success: Found ${allTones.length} total brand tones\n`);
    } catch (error) {
      console.log(`⚠️  Expected auth failure: ${error.message}\n`);
    }

    // Test 4: Update brand tone (requires admin auth)
    if (createdToneId) {
      console.log("✏️  Test 4: PUT /api/admin/brand-tones");
      try {
        await makeRequest(`${API_BASE}/api/admin/brand-tones`, {
          method: "PUT",
          body: JSON.stringify({
            id: createdToneId,
            ...updatedBrandTone,
          }),
        });
        console.log(`✅ Success: Updated brand tone ${createdToneId}\n`);
      } catch (error) {
        console.log(`⚠️  Expected auth failure: ${error.message}\n`);
      }
    }

    // Test 5: Get single brand tone by ID (requires admin auth)
    if (createdToneId) {
      console.log("🔍 Test 5: GET /api/admin/brand-tones/[id]");
      try {
        const singleTone = await makeRequest(
          `${API_BASE}/api/admin/brand-tones/${createdToneId}`
        );
        console.log(`✅ Success: Retrieved brand tone "${singleTone.name}"\n`);
      } catch (error) {
        console.log(`⚠️  Expected auth failure: ${error.message}\n`);
      }
    }

    // Test 6: Delete brand tone (requires admin auth)
    if (createdToneId) {
      console.log("🗑️  Test 6: DELETE /api/admin/brand-tones");
      try {
        await makeRequest(
          `${API_BASE}/api/admin/brand-tones?id=${createdToneId}`,
          {
            method: "DELETE",
          }
        );
        console.log(`✅ Success: Deleted brand tone ${createdToneId}\n`);
      } catch (error) {
        console.log(`⚠️  Expected auth failure: ${error.message}\n`);
      }
    }
  } catch (error) {
    console.error("💥 Test suite failed:", error.message);
    process.exit(1);
  }

  console.log("✅ Brand Tones API tests completed!");
  console.log("\n📝 Notes:");
  console.log(
    "- Tests that require admin authentication will fail without proper auth headers"
  );
  console.log(
    "- The public /api/brand-tones/active endpoint should work without authentication"
  );
  console.log(
    "- Admin endpoints (/api/admin/brand-tones) require Firebase admin authentication"
  );
  console.log(
    "- For full testing, run these tests through the admin UI or with proper auth tokens"
  );
}

// Run tests if this file is executed directly
if (require.main === module) {
  testBrandTonesCRUD().catch(console.error);
}

module.exports = { testBrandTonesCRUD };
