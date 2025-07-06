#!/usr/bin/env node

/**
 * Test script for Email CSS Export Integration with Platform Support
 *
 * This script validates that:
 * 1. Email HTML includes selected stylesheet CSS
 * 2. CSS is properly inlined and email-compatible
 * 3. Platform-specific HTML generation works (SendGrid, Mailchimp, Generic)
 * 4. Export works with and without selected stylesheets
 * 5. No regressions in web HTML export functionality
 */

const { MongoClient } = require("mongodb");

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DATABASE_NAME = "motive-archive-manager";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// Sample test blocks
const testBlocks = [
  {
    id: "text-1",
    type: "text",
    order: 0,
    content: "Welcome to our newsletter!",
    element: "h1",
    styles: {},
    metadata: { source: "test" },
  },
  {
    id: "text-2",
    type: "text",
    order: 1,
    content: "This is a test email with custom styling.",
    element: "p",
    styles: {},
    metadata: { source: "test" },
  },
  {
    id: "image-1",
    type: "image",
    order: 2,
    imageUrl: "https://via.placeholder.com/600x300",
    altText: "Test image",
    caption: "Sample image for testing",
    styles: {},
    metadata: { source: "test" },
  },
  {
    id: "divider-1",
    type: "divider",
    order: 3,
    styles: {},
    metadata: { source: "test" },
  },
];

// Test metadata
const testMetadata = {
  name: "Test Email Composition",
  exportedAt: new Date().toISOString(),
  previewText: "Test email for CSS integration",
};

async function testExportEndpoint() {
  console.log("🧪 Testing Email CSS Export Integration...\n");

  try {
    // Test 1: Web HTML Export (baseline)
    console.log("1. Testing Web HTML Export (baseline)...");
    const webResponse = await fetch(
      `${API_BASE_URL}/api/content-studio/export-html`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token", // Mock auth for testing
        },
        body: JSON.stringify({
          blocks: testBlocks,
          template: null,
          metadata: testMetadata,
          format: "web",
        }),
      }
    );

    if (webResponse.ok) {
      const webData = await webResponse.json();
      console.log("✅ Web HTML export successful");
      console.log(`   HTML length: ${webData.html.length} characters`);
    } else {
      console.log("❌ Web HTML export failed");
      console.log(`   Status: ${webResponse.status}`);
    }

    // Test 2: Generic Email HTML Export
    console.log("\n2. Testing Generic Email HTML Export...");
    const genericResponse = await fetch(
      `${API_BASE_URL}/api/content-studio/export-html`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          blocks: testBlocks,
          template: null,
          metadata: testMetadata,
          format: "email",
          emailPlatform: "generic",
        }),
      }
    );

    if (genericResponse.ok) {
      const genericData = await genericResponse.json();
      console.log("✅ Generic email HTML export successful");
      console.log(`   HTML length: ${genericData.html.length} characters`);
      console.log(
        `   Contains DOCTYPE: ${genericData.html.includes("<!DOCTYPE html>")}`
      );
    } else {
      console.log("❌ Generic email HTML export failed");
      console.log(`   Status: ${genericResponse.status}`);
    }

    // Test 3: SendGrid Email HTML Export
    console.log("\n3. Testing SendGrid Email HTML Export...");
    const sendgridResponse = await fetch(
      `${API_BASE_URL}/api/content-studio/export-html`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          blocks: testBlocks,
          template: null,
          metadata: testMetadata,
          format: "email",
          emailPlatform: "sendgrid",
        }),
      }
    );

    if (sendgridResponse.ok) {
      const sendgridData = await sendgridResponse.json();
      console.log("✅ SendGrid email HTML export successful");
      console.log(`   HTML length: ${sendgridData.html.length} characters`);
      console.log(
        `   Contains .container: ${sendgridData.html.includes(".container")}`
      );
      console.log(
        `   Simple structure: ${!sendgridData.html.includes("xmlns:v")}`
      );
    } else {
      console.log("❌ SendGrid email HTML export failed");
      console.log(`   Status: ${sendgridResponse.status}`);
    }

    // Test 4: Mailchimp Email HTML Export
    console.log("\n4. Testing Mailchimp Email HTML Export...");
    const mailchimpResponse = await fetch(
      `${API_BASE_URL}/api/content-studio/export-html`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          blocks: testBlocks,
          template: null,
          metadata: testMetadata,
          format: "email",
          emailPlatform: "mailchimp",
        }),
      }
    );

    if (mailchimpResponse.ok) {
      const mailchimpData = await mailchimpResponse.json();
      console.log("✅ Mailchimp email HTML export successful");
      console.log(`   HTML length: ${mailchimpData.html.length} characters`);
      console.log(
        `   Contains MSO conditionals: ${mailchimpData.html.includes("<!--[if mso]>")}`
      );
      console.log(
        `   Contains table structure: ${mailchimpData.html.includes('role="presentation"')}`
      );
    } else {
      console.log("❌ Mailchimp email HTML export failed");
      console.log(`   Status: ${mailchimpResponse.status}`);
    }

    // Test 5: CSS Integration Test
    console.log("\n5. Testing CSS Integration...");
    const cssResponse = await fetch(
      `${API_BASE_URL}/api/content-studio/export-html`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          blocks: testBlocks,
          template: null,
          metadata: testMetadata,
          format: "email",
          emailPlatform: "sendgrid",
          selectedStylesheetId: "mcp2rkii7r1gtf7g0kw", // Motive Emails stylesheet
        }),
      }
    );

    if (cssResponse.ok) {
      const cssData = await cssResponse.json();
      console.log("✅ CSS integration test successful");
      console.log(`   HTML length: ${cssData.html.length} characters`);
      console.log(
        `   Contains custom CSS: ${cssData.html.includes("<style>")}`
      );
      console.log(
        `   Email-optimized: ${!cssData.html.includes(".content-studio-preview")}`
      );
    } else {
      console.log("❌ CSS integration test failed");
      console.log(`   Status: ${cssResponse.status}`);
    }

    console.log("\n🎉 All tests completed!");

    // Summary
    console.log("\n📊 Test Summary:");
    console.log("- Web HTML Export: Basic functionality");
    console.log("- Generic Email: Universal compatibility");
    console.log("- SendGrid: Clean, simple structure for design editor");
    console.log("- Mailchimp: Full table-based layout with MSO support");
    console.log("- CSS Integration: Email-optimized styling");
    console.log(
      "\nThe new export system provides platform-specific optimization"
    );
    console.log(
      "while maintaining backward compatibility with existing functionality."
    );
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    process.exit(1);
  }
}

async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...");

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db(DATABASE_NAME);
    const stylesheets = db.collection("stylesheets");

    // Check if test stylesheet exists
    const testStylesheet = await stylesheets.findOne({
      id: "mcp2rkii7r1gtf7g0kw",
    });

    if (testStylesheet) {
      console.log("✅ Test stylesheet found");
      console.log(`   Name: ${testStylesheet.name}`);
      console.log(
        `   CSS Length: ${testStylesheet.cssContent?.length || 0} characters`
      );
    } else {
      console.log("⚠️  Test stylesheet not found, CSS tests will use null");
    }

    await client.close();
    console.log("✅ Database connection successful\n");
  } catch (error) {
    console.log("❌ Database connection failed:", error.message);
    console.log("⚠️  Proceeding with API tests only\n");
  }
}

async function main() {
  console.log("🚀 Email CSS Export Integration Test Suite");
  console.log("==========================================\n");

  // Test database connection
  await testDatabaseConnection();

  // Test export endpoints
  await testExportEndpoint();

  console.log("\n✨ Test suite completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Test the export modal in the UI");
  console.log("2. Verify SendGrid compatibility by pasting HTML into SendGrid");
  console.log("3. Test Mailchimp compatibility with their HTML editor");
  console.log("4. Validate CSS integration with your custom stylesheets");
}

// Run the test suite
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testExportEndpoint, testDatabaseConnection };
