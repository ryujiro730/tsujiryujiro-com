'use client'

import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface LightboxProps {
  photos: string[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
}

export default function Lightbox({ photos, index, onClose, onChange }: LightboxProps) {
  const total = photos.length

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onChange((index - 1 + total) % total)
      if (e.key === 'ArrowRight') onChange((index + 1) % total)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [index, total, onClose, onChange])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-full text-white/70 hover:text-white"
        style={{ background: 'rgba(255,255,255,0.1)' }}
        onClick={onClose}
      >
        <X size={22} />
      </button>

      {total > 1 && (
        <>
          <button
            className="absolute left-3 p-3 rounded-full text-white/70 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onClick={e => { e.stopPropagation(); onChange((index - 1 + total) % total) }}
          >
            <ChevronLeft size={26} />
          </button>
          <button
            className="absolute right-3 p-3 rounded-full text-white/70 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onClick={e => { e.stopPropagation(); onChange((index + 1) % total) }}
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt=""
        className="rounded-xl"
        style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain' }}
        onClick={e => e.stopPropagation()}
      />

      {total > 1 && (
        <div className="absolute bottom-5 flex gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); onChange(i) }}
              className="rounded-full transition-all"
              style={{
                width: i === index ? '20px' : '6px',
                height: '6px',
                background: i === index ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
