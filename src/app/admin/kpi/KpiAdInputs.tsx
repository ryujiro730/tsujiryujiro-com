'use client'

import { useState } from 'react'

export default function KpiAdInputs({
  totalUsers,
  totalRevenue,
}: {
  totalUsers: number
  totalRevenue: number
}) {
  const [adSpend, setAdSpend] = useState('')
  const [pageViews, setPageViews] = useState('')
  const [costRatio, setCostRatio] = useState('30') // AI費用など原価率%

  const spend = parseFloat(adSpend) || 0
  const views = parseFloat(pageViews) || 0
  const cost = parseFloat(costRatio) || 0

  const lpCvr = views > 0 ? ((totalUsers / views) * 100).toFixed(1) + '%' : null
  const cpa = totalUsers > 0 && spend > 0 ? '¥' + Math.round(spend / totalUsers).toLocaleString() : null
  const grossProfit = totalRevenue * (1 - cost / 100)
  const grossProfitPerUser = totalUsers > 0 ? '¥' + Math.round(grossProfit / totalUsers).toLocaleString() : null

  const inputCls = 'input-warm px-3 py-2 text-sm w-full'

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">広告費合計（¥）</label>
          <input
            type="number"
            value={adSpend}
            onChange={e => setAdSpend(e.target.value)}
            placeholder="100000"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">LPページビュー数</label>
          <input
            type="number"
            value={pageViews}
            onChange={e => setPageViews(e.target.value)}
            placeholder="10000"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">原価率（%）— AI費用等</label>
          <input
            type="number"
            value={costRatio}
            onChange={e => setCostRatio(e.target.value)}
            placeholder="30"
            min="0"
            max="100"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        {[
          { label: 'LP CVR', value: lpCvr, sub: pageViews ? `${totalUsers}人 / ${parseInt(pageViews).toLocaleString()}PV` : '　', color: '#3b82f6' },
          { label: 'CPA', value: cpa, sub: adSpend ? `広告費 ¥${parseInt(adSpend).toLocaleString()} / ${totalUsers}人` : '　', color: '#3b82f6' },
          { label: '1ユーザーあたり粗利', value: grossProfitPerUser, sub: `原価率${costRatio}%として計算`, color: '#10b981' },
          { label: '粗利合計', value: totalRevenue > 0 ? '¥' + Math.round(grossProfit).toLocaleString() : null, sub: `売上 ¥${totalRevenue.toLocaleString()} × ${100 - cost}%`, color: '#10b981' },
        ].map(card => (
          <div key={card.label} className="rounded-xl p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs text-[var(--color-text-muted)] mb-2">{card.label}</p>
            {card.value ? (
              <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
            ) : (
              <p className="text-lg font-semibold text-[var(--color-text-muted)]">—</p>
            )}
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
