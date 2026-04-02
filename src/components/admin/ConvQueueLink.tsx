'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * 会話リンク — クリック時にキュー（会話IDの順序）をsessionStorageに保存する。
 * 会話詳細ページで「次の会話」へ自動遷移するために使用。
 */
export function ConvQueueLink({
  convId,
  allConvIds,
  returnTo,
  className,
  children,
}: {
  convId: string
  allConvIds: string[]
  returnTo?: string
  className?: string
  children: ReactNode
}) {
  const saveQueue = () => {
    const pos = allConvIds.indexOf(convId)
    sessionStorage.setItem('convQueue', JSON.stringify(allConvIds))
    sessionStorage.setItem('convQueuePos', String(pos))
    if (returnTo) sessionStorage.setItem('convQueueReturn', returnTo)
  }

  return (
    <Link
      href={`/admin/conversations/${convId}`}
      onClick={saveQueue}
      className={className}
    >
      {children}
    </Link>
  )
}
