import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@banderoli/contracts',
    '@banderoli/database',
    '@banderoli/customs-exposure-engine',
    '@banderoli/flight-intelligence',
  ],
  serverExternalPackages: ['@prisma/client', '@auth/prisma-adapter'],
};

export default withNextIntl(nextConfig);
