'use client'

import { useState } from 'react'

const BASE = 'https://matchkoi.com/lp/1'
const HREF_SP = `${BASE}?utm_source=aikano&utm_medium=banner&utm_campaign=blog&utm_content=floating_sp`
const HREF_PC = `${BASE}?utm_source=aikano&utm_medium=banner&utm_campaign=blog&utm_content=floating_pc`

export function MatchkoiFloatingBanner() {
  const [closed, setClosed] = useState(false)
  if (closed) return null

  return (
    <>
      <style>{`
        @keyframes mkPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,67,143,0.5), 0 8px 32px rgba(232,67,143,0.3); }
          50%       { box-shadow: 0 0 0 8px rgba(232,67,143,0), 0 8px 40px rgba(232,67,143,0.5); }
        }
        @keyframes mkBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
        .mk-float { animation: mkPulse 2s ease-in-out infinite; }
        .mk-badge { animation: mkBounce 1.4s ease-in-out infinite; }
      `}</style>

      {/* ── スマホ: 画面下固定 ── */}
      <div
        className="lg:hidden mk-float"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          borderTop: '3px solid #e8438f',
          background: '#fff',
        }}
      >
        <button
          onClick={() => setClosed(true)}
          aria-label="閉じる"
          style={{
            position: 'absolute', top: 4, right: 4, zIndex: 1,
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            border: 'none', fontSize: 13, lineHeight: 1,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
        <a href={HREF_SP} target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'block' }}>
          <img
            src="/banners/matchkoi-wide.png"
            alt="マチコイ — 無料登録で始める"
            style={{ width: '100%', display: 'block', maxHeight: '90px', objectFit: 'cover', objectPosition: 'center 20%' }}
          />
        </a>
      </div>

      {/* ── PC: 画面右下固定 ── */}
      <div
        className="hidden lg:block mk-float"
        style={{
          position: 'fixed', bottom: 32, right: 20, zIndex: 9999,
          width: 200, borderRadius: 16, overflow: 'visible',
        }}
      >
        {/* 角バッジ */}
        <div
          className="mk-badge"
          style={{
            position: 'absolute', top: -12, left: -12, zIndex: 2,
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            border: '3px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 900, color: '#fff',
            textAlign: 'center', lineHeight: 1.2,
            boxShadow: '0 4px 12px rgba(245,158,11,0.5)',
          }}
        >無料<br />登録</div>

        <button
          onClick={() => setClosed(true)}
          aria-label="閉じる"
          style={{
            position: 'absolute', top: 6, right: 6, zIndex: 3,
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            border: 'none', fontSize: 12, lineHeight: 1,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>

        <a href={HREF_PC} target="_blank" rel="noopener noreferrer sponsored"
          style={{ display: 'block', borderRadius: 16, overflow: 'hidden' }}>
          <img
            src="/banners/matchkoi-portrait.png"
            alt="マチコイ — 無料登録で始める"
            style={{ width: '100%', display: 'block' }}
          />
        </a>
      </div>
    </>
  )
}
