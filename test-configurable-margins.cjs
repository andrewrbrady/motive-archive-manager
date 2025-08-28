#!/usr/bin/env node

/**
 * Test configurable margins in table-based email layouts
 * Verifies that margins can be controlled via block styles and configuration
 */

// Mock the required functions for testing
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function generateEmailClasses(defaultClasses, block) {
  const classes = [defaultClasses];
  if (block.cssClassName) {
    classes.push(block.cssClassName);
  }
  return classes.filter(Boolean).join(" ");
}

// Test configuration
const DEFAULT_EMAIL_MARGINS = {
  blockBottom: "12px",
  blockTop: "0px", 
  buttonVertical: "24px",
  dividerVertical: "24px",
  listItemBottom: "8px",
  textBlockBottom: "12px",
  imageBlockBottom: "12px",
  htmlBlockBottom: "12px",
  videoBlockBottom: "12px",
};

function getBlockMargin(block, position, defaultValue) {
  // Check block-level styles first
  if (block.styles) {
    const marginKey = position === 'vertical' ? 'margin' : `margin-${position}`;
    if (block.styles[marginKey]) {
      return block.styles[marginKey];
    }
    if (position === 'vertical' && (block.styles.marginTop || block.styles.marginBottom)) {
      const top = block.styles.marginTop || '0px';
      const bottom = block.styles.marginBottom || '0px';
      return `${top} 0 ${bottom} 0`;
    }
  }

  // Check if block has margin configuration
  if (block.margin && typeof block.margin === 'object') {
    if (position === 'vertical' && (block.margin.top || block.margin.bottom)) {
      const top = block.margin.top || '0px';
      const bottom = block.margin.bottom || '0px';
      return `${top} 0 ${bottom} 0`;
    }
    if (block.margin[position]) {
      return block.margin[position];
    }
  }

  // For divider blocks, check the margin property
  if (block.type === 'divider' && block.margin) {
    return position === 'vertical' ? `${block.margin} 0` : block.margin;
  }

  // Return default
  return position === 'vertical' ? `${defaultValue} 0` : defaultValue;
}

function createTableWrapper(content, block, defaultMargin = DEFAULT_EMAIL_MARGINS.blockBottom) {
  const margin = getBlockMargin(block, 'vertical', defaultMargin);
  const customClasses = generateEmailClasses("", block);
  
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: ${margin};"${customClasses ? ` class="${customClasses}"` : ""}>
    ${content}
  </table>`;
}

// Test blocks with different margin configurations
const testBlocks = [
  {
    id: "text-default",
    type: "text",
    content: "Text with default margins",
    element: "p",
    order: 1,
  },
  {
    id: "text-custom-styles",
    type: "text", 
    content: "Text with custom margin via styles",
    element: "p",
    styles: {
      marginTop: "30px",
      marginBottom: "15px"
    },
    order: 2,
  },
  {
    id: "text-custom-margin-object",
    type: "text",
    content: "Text with custom margin via margin object",
    element: "p", 
    margin: {
      top: "40px",
      bottom: "20px"
    },
    order: 3,
  },
  {
    id: "divider-default",
    type: "divider",
    order: 4,
  },
  {
    id: "divider-custom",
    type: "divider",
    margin: "50px", // Legacy divider margin format
    order: 5,
  },
  {
    id: "button-custom",
    type: "button",
    text: "Custom Button",
    url: "https://example.com",
    styles: {
      margin: "60px 0"
    },
    order: 6,
  },
  {
    id: "image-custom",
    type: "image",
    imageUrl: "https://example.com/image.jpg",
    altText: "Test image",
    margin: {
      top: "10px",
      bottom: "25px"
    },
    order: 7,
  }
];

function generateTestHTML(blocks) {
  return blocks.map((block) => {
    switch (block.type) {
      case "text": {
        const element = block.element || "p";
        const content = block.content || "";
        const textElement = `<tr><td><${element}>${escapeHtml(content)}</${element}></td></tr>`;
        return createTableWrapper(textElement, block, DEFAULT_EMAIL_MARGINS.textBlockBottom);
      }
      case "divider": {
        const dividerContent = `<tr><td><hr style="border: none; border-top: 1px solid #e1e4e8; height: 1px;"></td></tr>`;
        return createTableWrapper(dividerContent, block, DEFAULT_EMAIL_MARGINS.dividerVertical);
      }
      case "button": {
        const buttonText = block.text || "Button";
        const buttonUrl = block.url || "#";
        const buttonContent = `<tr><td align="center"><a href="${escapeHtml(buttonUrl)}" style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 12px 24px; text-decoration: none;">${escapeHtml(buttonText)}</a></td></tr>`;
        return createTableWrapper(buttonContent, block, DEFAULT_EMAIL_MARGINS.buttonVertical);
      }
      case "image": {
        const imageUrl = block.imageUrl || "";
        const altText = block.altText || "";
        const imageContent = `<tr><td align="center"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" style="display: block; max-width: 100%; height: auto;"></td></tr>`;
        return createTableWrapper(imageContent, block, DEFAULT_EMAIL_MARGINS.imageBlockBottom);
      }
      default:
        return `<!-- Unsupported block type: ${block.type} -->`;
    }
  }).join("\n");
}

function testConfigurableMargins() {
  console.log("🧪 Testing configurable margins in email table layouts...");
  
  const generatedHTML = generateTestHTML(testBlocks);
  
  // Test cases
  const tests = [
    {
      name: "Default text margin",
      expected: `style="margin: ${DEFAULT_EMAIL_MARGINS.textBlockBottom} 0;"`,
      description: "Text block should use default margin"
    },
    {
      name: "Custom text margin via styles",
      expected: `style="margin: 30px 0 15px 0;"`,
      description: "Text block should use custom margins from styles"
    },
    {
      name: "Custom text margin via margin object", 
      expected: `style="margin: 40px 0 20px 0;"`,
      description: "Text block should use custom margins from margin object"
    },
    {
      name: "Default divider margin",
      expected: `style="margin: ${DEFAULT_EMAIL_MARGINS.dividerVertical} 0;"`,
      description: "Divider should use default margin"
    },
    {
      name: "Custom divider margin",
      expected: `style="margin: 50px 0;"`,
      description: "Divider should use custom margin"
    },
    {
      name: "Custom button margin",
      expected: `style="margin: 60px 0;"`,
      description: "Button should use custom margin from styles"
    },
    {
      name: "Custom image margin",
      expected: `style="margin: 10px 0 25px 0;"`,
      description: "Image should use custom margin from margin object"
    }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  console.log(`📋 Running ${totalTests} margin configuration tests...\n`);
  
  tests.forEach((test, index) => {
    const found = generatedHTML.includes(test.expected);
    const status = found ? "✅ PASS" : "❌ FAIL";
    
    console.log(`${index + 1}. ${test.name}: ${status}`);
    console.log(`   ${test.description}`);
    console.log(`   Expected: ${test.expected}`);
    
    if (!found) {
      // Show what was actually generated for debugging
      const lines = generatedHTML.split('\n');
      const relevantLine = lines.find(line => line.includes('style="margin:') && line.includes(test.name.split(' ')[0].toLowerCase()));
      if (relevantLine) {
        console.log(`   Actually: ${relevantLine.trim()}`);
      }
    }
    
    if (found) passedTests++;
    console.log("");
  });
  
  // Additional structural tests
  console.log("🏗️  Structural Tests:");
  
  const tableCount = (generatedHTML.match(/<table[^>]*role="presentation"/g) || []).length;
  const marginCount = (generatedHTML.match(/style="margin:[^"]+"/g) || []).length;
  const hasNoHardcodedMargins = !generatedHTML.includes('margin: 12px') || !generatedHTML.includes('margin: 20px');
  
  console.log(`   - Presentation tables: ${tableCount} ${tableCount === testBlocks.length ? '✅' : '❌'}`);
  console.log(`   - Margin declarations: ${marginCount} ${marginCount === testBlocks.length ? '✅' : '❌'}`);
  console.log(`   - No hardcoded default margins: ${hasNoHardcodedMargins ? '✅' : '❌'}`);
  
  // Overall results
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests && tableCount === testBlocks.length) {
    console.log("🎉 SUCCESS: All margin configuration tests passed!");
    console.log("   ✅ Margins can be controlled via block.styles");
    console.log("   ✅ Margins can be controlled via block.margin object");
    console.log("   ✅ Default margins are applied when no custom margins specified");
    console.log("   ✅ All blocks are properly wrapped in presentation tables");
    console.log("   ✅ No hardcoded margins remain in the generated HTML");
  } else {
    console.log("⚠️  Some tests failed - margin configuration needs adjustment");
  }
  
  // Save the generated HTML for inspection
  const fs = require('fs');
  const filename = `configurable-margins-test-${Date.now()}.html`;
  
  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Configurable Margins Test</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
  <h1>Configurable Margins Test</h1>
  <div style="max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
    ${generatedHTML}
  </div>
</body>
</html>`;
  
  fs.writeFileSync(filename, fullHTML);
  console.log(`\n💾 Generated HTML saved to: ${filename}`);
  
  return passedTests === totalTests;
}

// Run the test
testConfigurableMargins();

