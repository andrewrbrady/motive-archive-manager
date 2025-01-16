export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "auto" | "webp" | "avif" | "jpeg";
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  dpr?: number;
}

export function transformImageUrl(
  url: string,
  options: ImageTransformOptions
): string {
  // If the URL is not from our supported domains, return it as is
  if (!url.includes("imagedelivery.net") && !url.includes("cdn-cgi")) {
    return url;
  }

  // Build the options string
  const transformOptions: string[] = [];

  if (options.width) transformOptions.push(`width=${options.width}`);
  if (options.height) transformOptions.push(`height=${options.height}`);
  if (options.quality) transformOptions.push(`quality=${options.quality}`);
  if (options.format) transformOptions.push(`format=${options.format}`);
  if (options.fit) transformOptions.push(`fit=${options.fit}`);
  if (options.dpr) transformOptions.push(`dpr=${options.dpr}`);

  // If no options are provided, return original URL
  if (transformOptions.length === 0) {
    return url;
  }

  // If URL already contains /cdn-cgi/image/, update the options
  if (url.includes("/cdn-cgi/image/")) {
    const [base, path] = url.split("/cdn-cgi/image/");
    const existingOptions = path.split("/")[0];
    return `${base}/cdn-cgi/image/${transformOptions.join(",")}/${path.slice(
      existingOptions.length + 1
    )}`;
  }

  // Otherwise, add the transformation path
  const [protocol, rest] = url.split("://");
  return `${protocol}://cdn-cgi/image/${transformOptions.join(",")}/${rest}`;
}

// Predefined transform presets
export const imagePresets = {
  thumbnail: {
    width: 150,
    height: 150,
    quality: 80,
    format: "auto",
    fit: "cover",
  } as ImageTransformOptions,

  gallery: {
    width: 300,
    quality: 85,
    format: "auto",
    fit: "cover",
  } as ImageTransformOptions,

  mainView: {
    width: 1200,
    quality: 85,
    format: "auto",
    fit: "contain",
    dpr: 2,
  } as ImageTransformOptions,

  fullscreen: {
    width: 1920,
    quality: 90,
    format: "auto",
    fit: "contain",
    dpr: 2,
  } as ImageTransformOptions,
};
