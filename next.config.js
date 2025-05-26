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
  // Prevent static optimization for API routes during build
  experimental: {
    isrMemoryCacheSize: 0, // Disable ISR memory cache
  },
  // Skip static optimization for API routes
  generateBuildId: async () => {
    // Return a unique build ID to prevent caching issues
    return `build-${Date.now()}`;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    domains: ["localhost", "imagedelivery.net"],
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
