'use client'

import Script from 'next/script'
import { useRef, useCallback } from 'react'

const WIDGETS_URL = 'https://platform.twitter.com/widgets.js'

export function TwitterEmbed({ tweetId, tweetUrl }: { tweetId: string; tweetUrl?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const url = tweetUrl ?? `https://twitter.com/i/status/${tweetId}`

  const onLoad = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).twttr?.widgets?.load) {
      (window as any).twttr.widgets.load(containerRef.current ?? undefined)
    }
  }, [])

  return (
    <div ref={containerRef} className="my-6 [&_.twitter-tweet]:!mx-auto">
      <blockquote className="twitter-tweet" data-dnt="true" data-media-max-width="560">
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      </blockquote>
      <Script src={WIDGETS_URL} strategy="lazyOnload" onLoad={onLoad} />
    </div>
  )
}
