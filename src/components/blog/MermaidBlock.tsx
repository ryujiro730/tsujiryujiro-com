'use client'

import { useEffect, useState } from 'react'

export function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    async function render() {
      const mermaid = (await import(/* webpackChunkName: "mermaid" */ 'mermaid')).default
      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg } = await mermaid.render(id, chart.trim())
        if (!cancelled) setSvg(svg)
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    }
    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) return <pre style={{ color: '#c00', fontSize: 12, padding: 12, background: '#fff0f0', borderRadius: 6 }}>{error}</pre>
  if (!svg) return <div style={{ textAlign: 'center', padding: '24px', color: '#bbb', fontSize: 13 }}>図を読み込んでいます…</div>
  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ textAlign: 'center', margin: '24px 0', overflowX: 'auto' }}
    />
  )
}
