/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  images: {
    domains: ['localhost'],
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