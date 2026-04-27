/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Runtime env surface for client-side checks
  env: {
    APP_NAME: 'Blot.',
    APP_MODE: process.env.APP_MODE || 'local', // 'local' | 'production'
  },
};

module.exports = nextConfig;
