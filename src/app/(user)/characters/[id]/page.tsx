'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Images } from 'lucide-react'
import Link from 'next/link'
import Lightbox from '@/components/Lightbox'
import type { Character, CharacterPhoto } from '@/types'

export default function CharacterDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [character, setCharacter] = useState<Character | null>(null)
  const [photos, setPhotos] = useState<CharacterPhoto[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [charRes, photosRes] = await Promise.all([
        supabase.from('characters').select('*').eq('id', params.id).single(),
        supabase.from('character_photos').select('*').eq('character_id', params.id).order('order_index'),
      ])
      if (!charRes.data) { router.push('/characters'); return }
      setCharacter(charRes.data)
      setPhotos(photosRes.data || [])
    }
    load()
  }, [params.id])

  if (!character) return null

  const allPhotos = [character.avatar_url, ...photos.map(p => p.url)]

  return (
    <div className="pb-24">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-4 pt-1">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-semibold">{character.name}</h1>
      </div>

      {/* メインビジュアル */}
      <div
        className="relative rounded-2xl overflow-hidden mb-4 cursor-pointer"
        style={{ aspectRatio: '3/4' }}
        onClick={() => setLightboxIndex(0)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-bold text-2xl leading-tight">
            {character.name}
            <span className="text-lg font-normal ml-2 opacity-80">{character.age}歳</span>
          </p>
          <p className="text-white/65 text-sm mt-1">{character.personality}</p>
        </div>
        {/* 拡大ヒント */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs text-white/60"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          タップで拡大
        </div>
      </div>

      {/* プロフィール */}
      <div className="glass rounded-2xl p-4 mb-4">
        <p className="text-sm leading-relaxed">{character.description}</p>
      </div>

      {/* フォトアルバム */}
      {photos.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2.5">
            <Images size={15} className="text-[var(--color-text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)]">フォト</h2>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-xl cursor-pointer"
                style={{ aspectRatio: '1' }}
                onClick={() => setLightboxIndex(i + 1)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* チャットボタン（固定） */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, var(--color-bg) 60%, transparent)' }}>
        <Link
          href={`/chat?character=${character.id}`}
          className="btn-cta block text-center py-4 rounded-2xl text-base font-semibold"
        >
          {character.name}と話す ♡
        </Link>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={allPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  )
}
