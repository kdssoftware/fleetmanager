/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3'],
  serverActions: {
    allowedOrigins: [
      'localhost:3000',
      '127.0.0.1:3000',
    ]
  }
};

module.exports = nextConfig;
