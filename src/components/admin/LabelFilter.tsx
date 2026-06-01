'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

type Label = { id: string; name: string; color: string }

export function LabelFilter({
  labels,
  selectedIds,
  mode,
}: {
  labels: Label[]
  selectedIds: string[]
  mode: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds))
  const [currentMode, setCurrentMode] = useState(mode)

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <select
          name="label_mode"
          value={currentMode}
          onChange={e => setCurrentMode(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-xs border border-[var(--color-border)] focus:outline-none"
        >
          <option value="or">OR（いずれかを含む）</option>
          <option value="and">AND（すべて含む）</option>
          <option value="not">NOT（含まない）</option>
        </select>
      </div>

      {/* 選択済みラベルIDをhidden inputで送信 */}
      {Array.from(selected).map(id => (
        <input key={id} type="hidden" name="label_ids" value={id} />
      ))}

      <div className="flex flex-wrap gap-2">
        {labels.map(label => {
          const checked = selected.has(label.id)
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => toggle(label.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all"
              style={{
                background: label.color + (checked ? '33' : '18'),
                borderColor: checked ? label.color : label.color + '66',
                color: label.color,
                fontWeight: checked ? 600 : 400,
              }}
            >
              {checked && <Check size={11} strokeWidth={3} />}
              {label.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
