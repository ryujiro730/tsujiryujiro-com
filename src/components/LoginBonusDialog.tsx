'use client'

import { useEffect, useState } from 'react'

interface BonusResult {
  awarded: boolean
  bonus_points?: number
  expires_at?: string
  regular_points?: number
}

export function LoginBonusDialog() {
  const [result, setResult] = useState<BonusResult | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch('/api/points/login-bonus', { method: 'POST' })
      .then(r => r.json())
      .then((data: BonusResult) => {
        if (data.awarded) {
          setResult(data)
          setVisible(true)
          const total = (data.regular_points ?? 0) + (data.bonus_points ?? 0)
          window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: total } }))
        }
      })
      .catch(() => {})
  }, [])

  if (!visible || !result) return null

  const expiresDate = result.expires_at
    ? new Date(result.expires_at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
    : ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: 'rgba(15,5,10,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={() => setVisible(false)}
    >
      {/* 浮かぶハート */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl pointer-events-none select-none"
          style={{
            left: `${15 + i * 14}%`,
            bottom: '20%',
            animation: `loginBonusFloat ${1.8 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.25}s`,
            opacity: 0.5,
          }}
        >
          {i % 2 === 0 ? '💕' : '✨'}
        </div>
      ))}

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(150deg, #fff5f8 0%, #fde8f2 100%)',
          borderRadius: '24px',
          border: '1.5px solid rgba(232,67,143,0.3)',
          boxShadow: '0 24px 64px rgba(232,67,143,0.28)',
          padding: '28px 24px 24px',
          width: '100%',
          maxWidth: '320px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* ヘッダー帯 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            borderRadius: '24px 24px 0 0',
            background: 'linear-gradient(90deg, #f9a8d4, #e8437f, #c026d3)',
          }}
        />

        <div style={{ fontSize: '48px', marginBottom: '8px', lineHeight: 1 }}>🎁</div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8437f', marginBottom: '4px', letterSpacing: '0.05em' }}>
          ログインボーナス
        </p>
        <p style={{ fontSize: '40px', fontWeight: 800, color: '#1a1a2e', lineHeight: 1, margin: '8px 0' }}>
          +2 <span style={{ fontSize: '20px', fontWeight: 600 }}>pt</span>
        </p>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>
          ボーナスポイント残高：{(result.bonus_points ?? 0).toLocaleString()} pt
          {expiresDate && (
            <><br /><span style={{ color: '#e8437f' }}>{expiresDate}まで有効</span></>
          )}
        </p>

        <div
          style={{
            background: 'rgba(232,67,143,0.06)',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#555',
            textAlign: 'left',
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: '#e8437f', fontWeight: 600 }}>ボーナスptとは？</span><br />
          ポイント消費時に通常ptより先に使われます。
          期限が切れると消滅します。
        </div>

        <button
          onClick={() => setVisible(false)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #f9a8d4, #e8437f)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          受け取る！
        </button>
      </div>

      <style>{`
        @keyframes loginBonusFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.5; }
          50% { transform: translateY(-24px) scale(1.15); opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
