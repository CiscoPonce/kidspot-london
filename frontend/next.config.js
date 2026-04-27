const { withPlausibleProxy } = require('next-plausible');

/** @type {import('next').NextConfig} */
const nextConfig = withPlausibleProxy()({
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.ggpht.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  reactStrictMode: true,
});

module.exports = nextConfig;
