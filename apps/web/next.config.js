/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ['@happy-bar/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'happy-bar-catalog.s3.us-east-2.amazonaws.com',
        pathname: '/**',
      },
      // Common image hosting domains
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/**',
      },
    ],
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
  },
  eslint: {
    dirs: ['app', 'components', 'hooks', 'lib'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
}
