/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Optimize for production
  poweredByHeader: false,
  compress: true,
  // Handle trailing slashes
  trailingSlash: false,
  // Optimize for deployment
  output: 'standalone',
}

module.exports = nextConfig 