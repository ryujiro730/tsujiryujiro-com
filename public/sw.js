const CACHE_NAME = 'lovechat-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
]

// インストール：静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

// フェッチ：ネットワーク優先、失敗時キャッシュ
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Supabase APIや外部リクエストはキャッシュしない
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('stripe.com') ||
    request.method !== 'GET'
  ) {
    event.respondWith(fetch(request))
    return
  }

  // Next.js APIルートはキャッシュしない
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // _next/static はネットワークファースト（デプロイ後に古いJSが残らないように）
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // その他：ネットワーク優先
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// プッシュ通知受信
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'LoveChat', body: event.data.text() }
  }

  const options = {
    body: data.body || '新しいメッセージが届きました',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/conversations' },
    actions: [
      { action: 'open', title: '返信を見る' },
      { action: 'close', title: '後で見る' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'LoveChat', options)
  )
})

// 通知クリック
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  const url = event.notification.data?.url || '/conversations'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
