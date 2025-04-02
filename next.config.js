/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    instrumentationHook: true,
  },
  // Remove middleware settings that might be interfering
  // These will be handled by Vercel automatically
};

export default nextConfig;
