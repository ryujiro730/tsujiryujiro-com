'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Send, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  { id: 'bug',     label: '🐛 バグ報告',         desc: '動かない、おかしい挙動など' },
  { id: 'feature', label: '✨ 機能要望',           desc: 'こんな機能があったら嬉しい' },
  { id: 'ai',      label: '🤖 AI返信について',     desc: '返信の質・キャラクターの違和感' },
  { id: 'ui',      label: '🎨 UIについて',         desc: '使いにくい、見づらいなど' },
  { id: 'other',   label: '💬 その他',             desc: '何でも気軽に' },
]

export default function FeedbackPage() {
  const router = useRouter()
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content: content.trim(), rating: rating || undefined }),
      })
      if (res.ok) setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'var(--color-bg)' }}>
        <div className="animate-fade-in">
          <CheckCircle size={64} className="mx-auto mb-6" style={{ color: '#e8438f' }} />
          <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--color-text)' }}>
            ありがとうございます！
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-text-muted)' }}>
            フィードバックを受け取りました。<br />
            いただいた内容は開発チームが確認し、<br />
            サービス改善に活かします。
          </p>
          <Link href="/characters" className="btn-cta"
            style={{ padding: '14px 36px', fontSize: '15px', borderRadius: '12px', display: 'inline-block', textDecoration: 'none' }}>
            チャットに戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 px-4 flex items-center gap-3"
        style={{ background: 'rgba(255,245,248,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(232,67,143,0.12)', height: '56px' }}>
        <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-lg"
          style={{ color: 'var(--color-text-muted)' }}>
          <ChevronLeft size={22} />
        </button>
        <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>フィードバック</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* プレリリースバナー */}
        <div className="rounded-2xl overflow-hidden mb-8"
          style={{ background: 'linear-gradient(135deg, #e8438f 0%, #a060e0 100%)' }}>
          <div className="px-5 py-6">
            <div className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              🚀 プレリリース版
            </div>
            <h2 className="text-white font-black text-xl leading-snug mb-2">
              あなたの声で<br />アイカノを育ててください
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              現在プレリリース中です。バグや使いにくい点、
              欲しい機能など、なんでも教えてください。
              いただいた声はすべて開発チームが読んでいます。
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* カテゴリ選択 */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              カテゴリを選んでください <span style={{ color: '#e8438f' }}>*</span>
            </p>
            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: category === cat.id
                      ? 'linear-gradient(135deg, rgba(232,67,143,0.1), rgba(160,96,224,0.1))'
                      : 'var(--color-surface)',
                    border: category === cat.id
                      ? '1.5px solid rgba(232,67,143,0.5)'
                      : '1.5px solid var(--color-border)',
                  }}
                >
                  <span className="text-lg leading-none mt-0.5">{cat.label.split(' ')[0]}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {cat.label.split(' ').slice(1).join(' ')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{cat.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 評価（任意） */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              全体的な満足度（任意）
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl transition-transform hover:scale-110"
                  style={{ filter: (hoverRating || rating) >= star ? 'none' : 'grayscale(1) opacity(0.3)' }}
                >
                  ⭐
                </button>
              ))}
              {rating > 0 && (
                <button type="button" onClick={() => setRating(0)}
                  className="text-xs ml-2 self-center"
                  style={{ color: 'var(--color-text-muted)' }}>
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* 内容 */}
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>
              詳しく教えてください <span style={{ color: '#e8438f' }}>*</span>
            </p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="気になった点や改善してほしいことを自由に書いてください。どんな些細なことでも大歓迎です！"
              rows={6}
              maxLength={2000}
              className="w-full input-warm px-4 py-3 resize-none"
              style={{ borderRadius: '14px', fontSize: '15px', lineHeight: '1.6' }}
            />
            <p className="text-right text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {content.length}/2000
            </p>
          </div>

          <button
            type="submit"
            disabled={!category || !content.trim() || submitting}
            className="btn-cta w-full flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ padding: '16px', fontSize: '16px', borderRadius: '14px' }}
          >
            {submitting ? (
              <span>送信中…</span>
            ) : (
              <>
                <Send size={18} />
                フィードバックを送る
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
