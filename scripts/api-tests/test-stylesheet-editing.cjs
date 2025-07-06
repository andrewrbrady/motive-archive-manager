/**
 * Test script for Stylesheet Editing API endpoints
 * Tests PUT and DELETE functionality for stylesheets
 *
 * Usage: node scripts/api-tests/test-stylesheet-editing.js
 */

const BASE_URL = "http://localhost:3000";

// Test CSS content for updates
const TEST_CSS_ORIGINAL = `
.container { 
  background-color: #ffffff; 
  padding: 20px; 
  border-radius: 4px; 
}
.header { 
  text-align: center; 
  background-color: #1A234E; 
  color: white; 
}
`;

const TEST_CSS_UPDATED = `
.container { 
  background-color: #f8f9fa; 
  padding: 30px; 
  border-radius: 8px; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.header { 
  text-align: center; 
  background-color: #2c3e50; 
  color: white; 
  padding: 20px;
}
.footer {
  text-align: center;
  color: #666;
  font-size: 14px;
}
`;

// Helper function to make API requests
async function apiRequest(endpoint, method = "GET", data = null) {
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const result = await response.json();

    return {
      status: response.status,
      data: result,
      ok: response.ok,
    };
  } catch (error) {
    console.error(`API Request failed for ${method} ${endpoint}:`, error);
    return {
      status: 0,
      data: { error: error.message },
      ok: false,
    };
  }
}

// Test functions
async function testCreateTestStylesheet() {
  console.log("\n🧪 Testing: Create test stylesheet for editing...");

  const stylesheetData = {
    name: "Test Stylesheet for Editing",
    cssContent: TEST_CSS_ORIGINAL,
    description: "Test stylesheet to verify editing functionality",
    version: "1.0.0",
    tags: ["test", "editing"],
  };

  const result = await apiRequest("/api/stylesheets", "POST", stylesheetData);

  if (result.ok) {
    console.log("✅ Test stylesheet created successfully");
    console.log(`   ID: ${result.data.stylesheet.id}`);
    console.log(`   Name: ${result.data.stylesheet.name}`);
    console.log(
      `   Classes parsed: ${result.data.stylesheet.parsedCSS.classes.length}`
    );
    return result.data.stylesheet.id;
  } else {
    console.log("❌ Failed to create test stylesheet");
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data.error}`);
    return null;
  }
}

async function testUpdateStylesheetMetadata(stylesheetId) {
  console.log("\n🧪 Testing: Update stylesheet metadata only...");

  const updateData = {
    name: "Test Stylesheet for Editing (Updated)",
    description: "Updated description for test stylesheet",
    version: "1.1.0",
    tags: ["test", "editing", "updated"],
  };

  const result = await apiRequest(
    `/api/stylesheets/${stylesheetId}`,
    "PUT",
    updateData
  );

  if (result.ok) {
    console.log("✅ Stylesheet metadata updated successfully");
    console.log(`   New name: ${result.data.stylesheet.name}`);
    console.log(`   New version: ${result.data.stylesheet.version}`);
    console.log(`   New description: ${result.data.stylesheet.description}`);
    console.log(`   Tags: ${result.data.stylesheet.tags.join(", ")}`);
    console.log(
      `   CSS classes count unchanged: ${result.data.stylesheet.parsedCSS.classes.length}`
    );
    return true;
  } else {
    console.log("❌ Failed to update stylesheet metadata");
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testUpdateStylesheetCSS(stylesheetId) {
  console.log("\n🧪 Testing: Update stylesheet CSS content...");

  const updateData = {
    cssContent: TEST_CSS_UPDATED,
    version: "2.0.0",
  };

  const result = await apiRequest(
    `/api/stylesheets/${stylesheetId}`,
    "PUT",
    updateData
  );

  if (result.ok) {
    const originalClasses = 2; // container, header
    const newClasses = result.data.stylesheet.parsedCSS.classes.length;

    console.log("✅ Stylesheet CSS content updated successfully");
    console.log(`   CSS classes re-parsed: ${originalClasses} → ${newClasses}`);
    console.log(`   New version: ${result.data.stylesheet.version}`);
    console.log(`   Updated timestamp: ${result.data.stylesheet.updatedAt}`);

    // Check if footer class was added
    const hasFooter = result.data.stylesheet.parsedCSS.classes.some(
      (c) => c.name === "footer"
    );
    console.log(`   Footer class added: ${hasFooter ? "✅" : "❌"}`);

    return newClasses > originalClasses;
  } else {
    console.log("❌ Failed to update stylesheet CSS content");
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testUpdateNonExistentStylesheet() {
  console.log("\n🧪 Testing: Update non-existent stylesheet...");

  const nonExistentId = "non-existent-stylesheet-id";
  const updateData = {
    name: "This should fail",
  };

  const result = await apiRequest(
    `/api/stylesheets/${nonExistentId}`,
    "PUT",
    updateData
  );

  if (result.status === 404) {
    console.log("✅ Correctly returned 404 for non-existent stylesheet");
    console.log(`   Error message: ${result.data.error}`);
    return true;
  } else {
    console.log("❌ Should have returned 404 for non-existent stylesheet");
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testUpdateWithInvalidData(stylesheetId) {
  console.log("\n🧪 Testing: Update with invalid data...");

  // Test empty name
  const invalidData = {
    name: "   ", // Empty name after trim
    cssContent: "", // Empty CSS
  };

  const result = await apiRequest(
    `/api/stylesheets/${stylesheetId}`,
    "PUT",
    invalidData
  );

  if (result.status === 400) {
    console.log("✅ Correctly rejected invalid data");
    console.log(`   Error message: ${result.data.error}`);
    return true;
  } else {
    console.log("❌ Should have rejected invalid data");
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testDeleteDemoStylesheet() {
  console.log("\n🧪 Testing: Delete demo stylesheet (should be prevented)...");

  const result = await apiRequest(
    "/api/stylesheets/demo-stylesheet-1",
    "DELETE"
  );

  if (result.status === 403) {
    console.log("✅ Correctly prevented deletion of demo stylesheet");
    console.log(`   Error message: ${result.data.error}`);
    return true;
  } else {
    console.log("❌ Should have prevented deletion of demo stylesheet");
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function testDeleteStylesheet(stylesheetId) {
  console.log("\n🧪 Testing: Delete test stylesheet...");

  const result = await apiRequest(`/api/stylesheets/${stylesheetId}`, "DELETE");

  if (result.ok) {
    console.log("✅ Stylesheet deleted successfully");
    console.log(`   Message: ${result.data.message}`);
    console.log(`   Deleted ID: ${result.data.id}`);
    return true;
  } else {
    console.log("❌ Failed to delete stylesheet");
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testDeleteNonExistentStylesheet() {
  console.log("\n🧪 Testing: Delete non-existent stylesheet...");

  const nonExistentId = "non-existent-stylesheet-id";
  const result = await apiRequest(
    `/api/stylesheets/${nonExistentId}`,
    "DELETE"
  );

  if (result.status === 404) {
    console.log("✅ Correctly returned 404 for non-existent stylesheet");
    console.log(`   Error message: ${result.data.error}`);
    return true;
  } else {
    console.log("❌ Should have returned 404 for non-existent stylesheet");
    console.log(`   Status: ${result.status}`);
    return false;
  }
}

async function verifyStylesheetDeleted(stylesheetId) {
  console.log("\n🧪 Testing: Verify stylesheet is soft-deleted...");

  // Try to get the stylesheet by ID
  const result = await apiRequest(`/api/stylesheets/${stylesheetId}`);

  if (result.ok && result.data.stylesheet.isActive === false) {
    console.log("✅ Stylesheet soft-deleted correctly (isActive: false)");
    return true;
  } else if (result.status === 404) {
    console.log(
      "⚠️  Stylesheet not found - may be filtered out by isActive query"
    );
    return true;
  } else {
    console.log("❌ Stylesheet deletion verification failed");
    console.log(`   Status: ${result.status}`);
    console.log(`   isActive: ${result.data.stylesheet?.isActive}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log("🚀 Starting Stylesheet Editing API Tests");
  console.log("==========================================");

  let testStylesheetId = null;
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Create test stylesheet
  totalTests++;
  testStylesheetId = await testCreateTestStylesheet();
  if (testStylesheetId) passedTests++;

  if (!testStylesheetId) {
    console.log("\n❌ Cannot continue tests without a test stylesheet");
    return;
  }

  // Test 2: Update metadata only
  totalTests++;
  if (await testUpdateStylesheetMetadata(testStylesheetId)) passedTests++;

  // Test 3: Update CSS content
  totalTests++;
  if (await testUpdateStylesheetCSS(testStylesheetId)) passedTests++;

  // Test 4: Update non-existent stylesheet
  totalTests++;
  if (await testUpdateNonExistentStylesheet()) passedTests++;

  // Test 5: Update with invalid data
  totalTests++;
  if (await testUpdateWithInvalidData(testStylesheetId)) passedTests++;

  // Test 6: Delete demo stylesheet (should fail)
  totalTests++;
  if (await testDeleteDemoStylesheet()) passedTests++;

  // Test 7: Delete non-existent stylesheet
  totalTests++;
  if (await testDeleteNonExistentStylesheet()) passedTests++;

  // Test 8: Delete test stylesheet
  totalTests++;
  if (await testDeleteStylesheet(testStylesheetId)) passedTests++;

  // Test 9: Verify stylesheet is deleted
  totalTests++;
  if (await verifyStylesheetDeleted(testStylesheetId)) passedTests++;

  // Results summary
  console.log("\n📊 Test Results Summary");
  console.log("======================");
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log(
      "\n🎉 All tests passed! Stylesheet editing API is working correctly."
    );
  } else {
    console.log(
      "\n⚠️  Some tests failed. Please check the API implementation."
    );
  }
}

// Check if this is being run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  apiRequest,
};
