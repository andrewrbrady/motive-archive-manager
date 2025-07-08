// Test the FIXED URL transformation logic from SortableGalleryItem.tsx
const getEnhancedImageUrl = (baseUrl, width, quality) => {
  let params = [];
  if (width && width.trim() !== "") params.push(`w=${width}`);
  if (quality && quality.trim() !== "") params.push(`q=${quality}`);

  if (params.length === 0) return baseUrl;

  if (baseUrl.includes("imagedelivery.net")) {
    const urlParts = baseUrl.split("/");

    // Check if the URL already has a variant (the last part after the image ID)
    if (urlParts.length >= 5) {
      const lastPart = urlParts[urlParts.length - 1];

      // If it's a named variant like 'public', 'thumbnail', etc.
      if (lastPart.match(/^[a-zA-Z]+$/)) {
        // Replace with flexible variant
        urlParts[urlParts.length - 1] = params.join(",");
        const transformedUrl = urlParts.join("/");
        console.log("URL transformation (named variant):", {
          baseUrl,
          transformedUrl,
          params,
        });
        return transformedUrl;
      }

      // If it's already a flexible variant like 'w=500,q=80' or 'w=500'
      if (lastPart.includes("=")) {
        // Replace the existing flexible variant
        urlParts[urlParts.length - 1] = params.join(",");
        const transformedUrl = urlParts.join("/");
        console.log("URL transformation (flexible variant):", {
          baseUrl,
          transformedUrl,
          params,
        });
        return transformedUrl;
      }
    }

    // URL doesn't have a variant, append transformations
    const transformedUrl = `${baseUrl}/${params.join(",")}`;
    console.log("URL transformation (no variant):", {
      baseUrl,
      transformedUrl,
      params,
    });
    return transformedUrl;
  }

  const transformedUrl = baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  console.log("URL transformation (fallback):", {
    baseUrl,
    transformedUrl,
    params,
  });
  return transformedUrl;
};

// Test with different URL formats that might be in the database
const testUrls = [
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/public",
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123",
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/thumbnail",
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/w=500,q=80",
  "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/abc123/w=1000",
];

console.log("\n=== Testing FIXED URL Transformation Logic ===");
testUrls.forEach((url) => {
  console.log(`\nTesting: ${url}`);
  const thumbnailUrl = getEnhancedImageUrl(url, "400", "85");
  console.log(`✅ Thumbnail: ${thumbnailUrl}`);
  const lightboxUrl = getEnhancedImageUrl(url, "1200", "90");
  console.log(`✅ Lightbox: ${lightboxUrl}`);
});
