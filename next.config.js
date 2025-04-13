/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: [
    "@tanstack/react-query",
    "@tanstack/react-query-devtools",
  ],
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
  // Set server port
  serverRuntimeConfig: {
    port: 3001,
  },
  // Set public runtime config
  publicRuntimeConfig: {
    port: 3001,
  },
};

export default nextConfig;
