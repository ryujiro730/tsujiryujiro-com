import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'AiKano - 超高性能AIがあなただけに返信します',
  description: '自社開発の超高性能AIが、あなたのメッセージにリアルタイムで返信します。アダルトOK・画像送り合いOK。',
  manifest: '/manifest.json',
  verification: {
    google: 'jQx46xWa8bl0-EM46wH1sZTCm1pA-m6DDdzLdcybgm8',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AiKano',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a1628',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
