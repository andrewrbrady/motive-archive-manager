/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
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
        hostname: "sothebysmotorsport.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "d3sm3e0zl6r9d1.cloudfront.net",
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
      {
        protocol: "https",
        hostname: "www.millermotorcars.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "millermotorcars.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.chicagomotorcars.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "chicagomotorcars.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.dealerspike.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "automanager.blob.core.windows.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.mouse-motors.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mouse-motors.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    instrumentationHook: true,
  },
  // Ensure middleware doesn't run in Edge Runtime
  middleware: {
    skipMiddlewareUrlNormalize: true,
    skipTrailingSlashRedirect: true,
  },
};

export default nextConfig;
