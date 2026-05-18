/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
    dangerouslyAllowSVG: true,
  },
  trailingSlash: false,
  async redirects() {
    return [
      // 末尾スラッシュを正規URLにリダイレクト
      { source: '/:path+/', destination: '/:path+', permanent: true },
      // ブラウザのi18n自動リクエスト対策
      { source: '/ja', destination: '/', permanent: false },
      { source: '/ja/:path*', destination: '/:path*', permanent: false },
    ]
  },
}

module.exports = nextConfig
