/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
    dangerouslyAllowSVG: true,
  },
  async redirects() {
    return [
      // ブラウザのi18n自動リクエスト対策
      { source: '/ja', destination: '/', permanent: false },
      { source: '/ja/:path*', destination: '/:path*', permanent: false },
    ]
  },
}

module.exports = nextConfig
