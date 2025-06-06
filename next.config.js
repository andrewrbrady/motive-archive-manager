/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: [
    "@tanstack/react-query",
    "@tanstack/react-query-devtools",
  ],
  outputFileTracingIncludes: {
    "/api/images/extend-canvas": [
      "./extend_canvas",
      "./extend_canvas_linux",
      "./extend_canvas_macos",
    ],
  },
  // Skip static optimization for API routes
  generateBuildId: async () => {
    // Return a unique build ID to prevent caching issues
    return `build-${Date.now()}`;
  },
  images: {
    // Use custom Cloudflare loader to handle Cloudflare Images URLs
    loader: "custom",
    loaderFile: "./src/lib/cloudflare-image-loader.ts",

    // Cloudflare Images domains
    domains: ["localhost", "imagedelivery.net", "cloudflareimages.com"],

    // Remote patterns for additional security
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "cloudflareimages.com",
      },
      {
        protocol: "https",
        hostname: "**", // Keep for backward compatibility
      },
    ],

    // Standard device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Let Cloudflare handle format optimization
    formats: ["image/webp"],

    // Standard cache TTL
    minimumCacheTTL: 60,
  },
  // Add webpack configuration for Node.js modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to load these libraries on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
  // Use environment variables for port configuration
  serverRuntimeConfig: {
    port: process.env.PORT || 3000,
  },
  // Use environment variables for port configuration
  publicRuntimeConfig: {
    port: process.env.PORT || 3000,
  },
};

export default nextConfig;
