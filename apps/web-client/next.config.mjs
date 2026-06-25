/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@banderoli/contracts', '@banderoli/database'],
  serverExternalPackages: ['@prisma/client', '@auth/prisma-adapter'],
};

export default nextConfig;
