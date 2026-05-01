/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest:            'public',
  register:        true,
  skipWaiting:     true,
  disable:         process.env.NODE_ENV === 'development',
  runtimeCaching: [],
})

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  webpack: (config, { dev }) => {
    config.resolve.alias.canvas   = false
    config.resolve.alias.encoding = false
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/.git/**', '**/test-results/**', '**/playwright-report/**'],
      }
    }
    return config
  },
}

module.exports = withPWA(nextConfig)
