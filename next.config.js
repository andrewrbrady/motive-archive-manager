/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Add webpack configuration to prevent hanging
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure client-side builds complete properly
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        url: false,
        assert: false,
        util: false,
        zlib: false,
      };
    }
    return config;
  },
};

export default nextConfig;
