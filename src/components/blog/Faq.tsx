'use client'

import { useState } from 'react'

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #e8e8e8' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '18px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.5 }}>{q}</span>
        <span style={{
          flexShrink: 0,
          width: '26px', height: '26px',
          borderRadius: '50%',
          background: open ? '#e8438f' : '#f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M2 4l4 4 4-4" stroke={open ? '#fff' : '#888'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '600px' : '0',
        transition: 'max-height 0.3s ease',
      }}>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.8, paddingBottom: '18px' }}>{a}</p>
      </div>
    </div>
  )
}

export function FaqSection({ title = 'よくある質問', children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="not-prose" style={{ margin: '40px 0' }}>
      <h2 style={{
        fontFamily: "'Noto Serif JP', serif",
        fontSize: '20px',
        fontWeight: 700,
        color: '#1a1a1a',
        marginBottom: '20px',
        paddingLeft: '14px',
        borderLeft: '4px solid #e8438f',
      }}>
        {title}
      </h2>
      <div style={{ borderTop: '1px solid #e8e8e8' }}>
        {children}
      </div>
    </div>
  )
}
