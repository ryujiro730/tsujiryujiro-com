'use client'
import { useEffect, useRef, ReactNode } from 'react'

export default function AnimateOnScroll({
  children,
  delay = 0,
  type = 'fade-up',
  className = '',
  style,
}: {
  children: ReactNode
  delay?: number
  type?: 'fade-up' | 'photo'
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => el.classList.add('aos-visible'), delay)
          } else {
            el.classList.add('aos-visible')
          }
          observer.unobserve(el)
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={`${type === 'photo' ? 'aos-photo' : 'aos-item'} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
