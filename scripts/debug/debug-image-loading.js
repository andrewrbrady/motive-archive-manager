// Debug script to test image URL generation and loading
// Run this in the browser console when the modal is open

function debugImageLoading() {
  console.log("=== IMAGE LOADING DEBUG ===");

  // Test URL transformation
  const testUrl =
    "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/test-image-id/public";
  console.log("Test URL:", testUrl);

  // Test enhanced URL generation
  function getEnhancedImageUrl(baseUrl, width, quality) {
    let params = [];
    if (width && width.trim() !== "") params.push(`w=${width}`);
    if (quality && quality.trim() !== "") params.push(`q=${quality}`);

    if (params.length === 0) return baseUrl;

    if (baseUrl.includes("imagedelivery.net")) {
      const urlParts = baseUrl.split("/");
      urlParts[urlParts.length - 1] = params.join(",");
      return urlParts.join("/");
    }

    return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  }

  const enhanced = getEnhancedImageUrl(testUrl, "2000", "100");
  console.log("Enhanced URL:", enhanced);

  // Test image loading
  const img = new Image();
  img.onload = () => {
    console.log("✅ Image loaded successfully:", {
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    });
  };
  img.onerror = (e) => {
    console.error("❌ Image failed to load:", {
      src: img.src,
      error: e,
    });
  };
  img.src = enhanced;

  console.log("Testing image load for:", enhanced);
}

// Auto-run if in browser
if (typeof window !== "undefined") {
  debugImageLoading();
}

module.exports = { debugImageLoading };
