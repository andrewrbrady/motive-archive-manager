/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: [
    "@tanstack/react-query",
    "@tanstack/react-query-devtools",
  ],
  // Skip static optimization for API routes
  generateBuildId: async () => {
    // Return a unique build ID to prevent caching issues
    return `build-${Date.now()}`;
  },
  images: {
    // Enable custom loader to bypass Vercel optimization
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

    // More conservative device sizes to reduce transformations
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Limit formats to reduce transformations
    formats: ["image/webp"],

    // Longer cache TTL to reduce reprocessing
    minimumCacheTTL: 2592000, // 30 days
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
        // MongoDB driver specific fallbacks
        dns: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        url: false,
        assert: false,
        util: false,
        zlib: false,
        "timers/promises": false,
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
