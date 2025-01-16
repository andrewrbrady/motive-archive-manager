/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.carsandbids.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn-cgi",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "bringatrailer.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pcarmarket.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.pcarmarket.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hips.hearstapps.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
