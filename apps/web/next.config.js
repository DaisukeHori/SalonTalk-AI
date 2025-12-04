/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@salontalk/shared'],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
