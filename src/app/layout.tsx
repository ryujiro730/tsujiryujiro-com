import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

const GA_ID = 'G-E01TLB4KY3'

export const metadata: Metadata = {
  title: 'AiKano - 超高性能AIがあなただけに返信します',
  description: '自社開発の超高性能AIが、あなたのメッセージにリアルタイムで返信します。アダルトOK・画像送り合いOK。',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
  },
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "AiKano",
              "url": "https://aikano.chat",
              "logo": "https://aikano.chat/icons/icon-192.png",
              "description": "自社チューニングの超高性能AIが、あなたのメッセージにリアルタイムで返信します。アダルトOK・画像送り合いOK。",
              "sameAs": [
                "https://www.youtube.com/@AI%E3%82%AB%E3%83%8E%E3%81%A1%E3%82%83%E3%82%93",
                "https://x.com/home",
                "https://www.instagram.com/aibijo_girl/"
              ]
            })
          }}
        />
      </head>
      <body className="min-h-screen">
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
