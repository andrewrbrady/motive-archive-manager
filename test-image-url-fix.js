/**
 * Test script to verify the image URL fix works correctly
 * Run with: node test-image-url-fix.js
 */

// Simulate the fixed function
function fixCloudflareImageUrl(url) {
  if (!url || url.trim() === "") {
    return "https://placehold.co/600x400?text=No+Image";
  }

  let result;

  if (url.includes("imagedelivery.net")) {
    const variants = [
      "/public",
      "/thumbnail",
      "/medium",
      "/large",
      "/highres",
      "/small",
      "/avatar",
      "/webp",
      "/preview",
      "/original",
    ];

    const hasVariant = variants.some((variant) => url.includes(variant));

    if (!hasVariant) {
      result = `${url}/public`;
    } else {
      let cleanUrl = url;

      const variantPattern = new RegExp(
        `(${variants.map((v) => v.replace("/", "\\/")).join("|")})(${variants.map((v) => v.replace("/", "\\/")).join("|")})+$`
      );

      if (variantPattern.test(url)) {
        const baseUrlMatch = url.match(
          /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
        );
        if (baseUrlMatch) {
          cleanUrl = `${baseUrlMatch[1]}/public`;
        }
      }

      result = cleanUrl;
    }
  } else {
    result = url;
  }

  return result;
}

// Test cases
const testCases = [
  // Problem case that was causing errors
  {
    input: "https://imagedelivery.net/account/imageId/small/public",
    expected: "https://imagedelivery.net/account/imageId/public",
    description: "Fix malformed double variant /small/public",
  },
  // Basic cases
  {
    input: "https://imagedelivery.net/account/imageId",
    expected: "https://imagedelivery.net/account/imageId/public",
    description: "Add /public to URL without variant",
  },
  {
    input: "https://imagedelivery.net/account/imageId/small",
    expected: "https://imagedelivery.net/account/imageId/small",
    description: "Keep valid /small variant",
  },
  {
    input: "https://imagedelivery.net/account/imageId/public",
    expected: "https://imagedelivery.net/account/imageId/public",
    description: "Keep valid /public variant",
  },
  // Edge cases
  {
    input: "",
    expected: "https://placehold.co/600x400?text=No+Image",
    description: "Handle empty string",
  },
  {
    input: "https://example.com/image.jpg",
    expected: "https://example.com/image.jpg",
    description: "Keep non-Cloudflare URLs unchanged",
  },
];

console.log("🧪 Testing Image URL Fix\n");

let allPassed = true;

testCases.forEach((test, index) => {
  const result = fixCloudflareImageUrl(test.input);
  const passed = result === test.expected;

  console.log(`Test ${index + 1}: ${test.description}`);
  console.log(`  Input:    "${test.input}"`);
  console.log(`  Expected: "${test.expected}"`);
  console.log(`  Got:      "${result}"`);
  console.log(`  Status:   ${passed ? "✅ PASS" : "❌ FAIL"}\n`);

  if (!passed) {
    allPassed = false;
  }
});

console.log(
  `\n${allPassed ? "🎉 All tests passed!" : "❌ Some tests failed!"}`
);
