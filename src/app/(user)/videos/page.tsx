'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Lock, Play, Loader2, X } from 'lucide-react'
import Link from 'next/link'

interface VideoItem {
  id: string
  character_id: string | null
  title: string
  description: string | null
  price_points: number
  thumbnail_url: string | null
  is_active: boolean
  sort_order: number
  video_url?: string | null
  character?: { name: string; avatar_url: string | null } | null
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set())
  const [points, setPoints] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [videosRes, itemsRes] = await Promise.all([
      fetch('/api/videos'),
      fetch('/api/items'),
    ])
    if (videosRes.ok) {
      const { videos: vids, purchasedIds: pids } = await videosRes.json()
      setVideos(vids ?? [])
      setPurchasedIds(new Set(pids ?? []))
    }
    if (itemsRes.ok) {
      const data = await itemsRes.json()
      setPoints(data.points ?? 0)
    }
    setLoading(false)
  }

  const purchaseVideo = async (video: VideoItem) => {
    if (purchasing) return
    if (!confirm(`「${video.title}」を${video.price_points}ptで購入しますか？`)) return
    setPurchasing(video.id)

    const res = await fetch('/api/videos/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoItemId: video.id }),
    })
    const data = await res.json()

    if (!res.ok) {
      if (data.error === 'insufficient_points') {
        alert(`ポイントが不足しています。\n現在: ${data.current}pt / 必要: ${data.required}pt`)
      } else if (data.error === 'already_purchased') {
        alert('この動画は既に購入済みです。')
        setPurchasedIds(prev => { const next = new Set(Array.from(prev)); next.add(video.id); return next })
      } else {
        alert(data.error || '購入に失敗しました')
      }
      setPurchasing(null)
      return
    }

    setPoints(data.newPoints)
    setPurchasedIds(prev => { const next = new Set(Array.from(prev)); next.add(video.id); return next })
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, video_url: data.videoUrl } : v))
    setPurchasing(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    )
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Link href="/shop" className="p-1.5 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-muted)]">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold">キャラ動画</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-warm)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{points}</span>
          <span className="text-xs text-[var(--color-text-muted)]">pt</span>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <span className="text-4xl mb-3 block">🎬</span>
          <p className="text-sm">動画はまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {videos.map(video => {
            const isPurchased = purchasedIds.has(video.id)
            const isPurchasing = purchasing === video.id
            const canAfford = points >= video.price_points

            return (
              <div
                key={video.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                {/* サムネイル */}
                <div
                  className="relative w-full cursor-pointer"
                  style={{ aspectRatio: '16/9' }}
                  onClick={() => isPurchased && video.video_url ? setPlayingVideo(video) : undefined}
                >
                  {video.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      style={!isPurchased ? { filter: 'blur(6px) brightness(0.7)', transform: 'scale(1.05)' } : undefined}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface-2)]">
                      <span className="text-3xl opacity-40">🎬</span>
                    </div>
                  )}

                  {!isPurchased && (
                    <>
                      {/* ピクセルオーバーレイ */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 8px)',
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                          <Lock size={18} className="text-white" />
                        </div>
                      </div>
                    </>
                  )}

                  {isPurchased && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.9)' }}>
                        <Play size={20} className="text-gray-800 ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* カード情報 */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  {/* キャラバッジ */}
                  {video.character && (
                    <div className="flex items-center gap-1.5">
                      {video.character.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.character.avatar_url} alt={video.character.name} className="w-5 h-5 rounded-full object-cover" />
                      )}
                      <span className="text-[10px] text-[var(--color-text-muted)]">{video.character.name}</span>
                    </div>
                  )}

                  <p className="font-semibold text-sm leading-tight line-clamp-2">{video.title}</p>

                  <div className="mt-auto">
                    {isPurchased ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ background: 'rgba(236,72,153,0.1)', color: 'var(--color-primary)' }}>
                          視聴済み
                        </span>
                        <button
                          onClick={() => video.video_url && setPlayingVideo(video)}
                          className="flex-1 btn-primary py-1.5 text-xs flex items-center justify-center gap-1"
                          style={{ borderRadius: '10px' }}
                        >
                          <Play size={12} />視聴する
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                            {video.price_points}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">pt</span>
                        </div>
                        <button
                          onClick={() => purchaseVideo(video)}
                          disabled={isPurchasing || !canAfford}
                          className="w-full btn-primary py-1.5 text-xs flex items-center justify-center gap-1 disabled:opacity-40"
                          style={{ borderRadius: '10px' }}
                        >
                          {isPurchasing ? (
                            <><Loader2 size={12} className="animate-spin" />購入中...</>
                          ) : !canAfford ? (
                            'ポイント不足'
                          ) : (
                            '購入して視聴'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/payment" className="text-sm text-[var(--color-primary)] underline-offset-2 hover:underline">
          ポイントを購入する →
        </Link>
      </div>

      {/* 動画モーダルプレイヤー */}
      {playingVideo && (
        <VideoModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}
    </div>
  )
}

function VideoModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-semibold text-sm">{video.title}</p>
            {video.character && (
              <p className="text-xs text-[var(--color-text-muted)]">{video.character.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-muted)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
          {video.video_url ? (
            <video
              ref={videoRef}
              src={video.video_url}
              controls
              autoPlay
              className="w-full h-full"
              style={{ outline: 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
              <p className="text-sm">動画を読み込めませんでした</p>
            </div>
          )}
        </div>
        {video.description && (
          <div className="px-4 py-3">
            <p className="text-xs text-[var(--color-text-muted)]">{video.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
