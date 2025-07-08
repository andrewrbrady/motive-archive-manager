#!/usr/bin/env node

/**
 * Simple SendGrid Compatibility Test
 * Tests the ultra-basic HTML structure for SendGrid compatibility
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// Minimal test blocks for SendGrid
const minimalBlocks = [
  {
    id: "text-1",
    type: "text",
    order: 0,
    content: "Hello SendGrid!",
    element: "h1",
    styles: {},
    metadata: { source: "test" },
  },
  {
    id: "text-2",
    type: "text",
    order: 1,
    content: "This is a simple test email.",
    element: "p",
    styles: {},
    metadata: { source: "test" },
  },
];

async function testSendGridBasic() {
  console.log("🧪 Testing SendGrid Ultra-Basic Structure...\n");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/content-studio/export-html`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          blocks: minimalBlocks,
          template: null,
          metadata: {
            name: "SendGrid Test",
            exportedAt: new Date().toISOString(),
          },
          format: "email",
          emailPlatform: "sendgrid",
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ SendGrid export successful");

      const html = data.html;

      // Validate SendGrid-specific requirements
      const checks = [
        { test: html.includes("<!DOCTYPE html PUBLIC"), desc: "XHTML DOCTYPE" },
        {
          test: html.includes('xmlns="http://www.w3.org/1999/xhtml"'),
          desc: "XHTML namespace",
        },
        {
          test: html.includes('role="presentation"'),
          desc: "Table-based structure",
        },
        {
          test: html.includes('cellspacing="0"'),
          desc: "Proper table attributes",
        },
        { test: html.includes('border="0"'), desc: "No table borders" },
        { test: html.includes("Hello SendGrid!"), desc: "Content included" },
        { test: !html.includes("<div"), desc: "No div elements" },
        { test: html.includes("color: #333333"), desc: "Inline text styling" },
        { test: html.includes("font-family: Arial"), desc: "Safe font family" },
        { test: html.length > 1000, desc: "Reasonable HTML size" },
      ];

      let passed = 0;
      checks.forEach((check) => {
        if (check.test) {
          console.log(`  ✅ ${check.desc}`);
          passed++;
        } else {
          console.log(`  ❌ ${check.desc}`);
        }
      });

      console.log(
        `\n📊 SendGrid compatibility: ${passed}/${checks.length} checks passed`
      );

      if (passed === checks.length) {
        console.log("🎉 Perfect! This HTML should work in SendGrid.");
      } else if (passed >= 8) {
        console.log("✅ Good! This HTML should mostly work in SendGrid.");
      } else {
        console.log(
          "⚠️  Some issues detected. SendGrid might reject this HTML."
        );
      }

      // Show a sample of the HTML
      console.log("\n📄 Sample HTML structure:");
      const lines = html.split("\n").slice(0, 15);
      lines.forEach((line) => {
        if (line.trim()) {
          console.log(
            `   ${line.trim().substring(0, 80)}${line.trim().length > 80 ? "..." : ""}`
          );
        }
      });

      console.log("\n💡 Tips for SendGrid success:");
      console.log("- Copy this HTML and paste directly into SendGrid");
      console.log("- Avoid adding custom CSS in SendGrid");
      console.log("- Keep content simple and basic");
      console.log("- If it still fails, try even simpler content blocks");
    } else {
      console.log("❌ SendGrid export failed");
      console.log(`   Status: ${response.status}`);
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }
}

async function main() {
  console.log("🚀 SendGrid Ultra-Basic Compatibility Test");
  console.log("==========================================\n");

  await testSendGridBasic();

  console.log("\n✨ Test completed!");
  console.log("\nNext steps if SendGrid still fails:");
  console.log("1. Try with even simpler content (just one text block)");
  console.log("2. Check SendGrid's current status and requirements");
  console.log("3. Contact SendGrid support if issues persist");
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSendGridBasic };
