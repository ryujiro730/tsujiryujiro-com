'use client'

import { useEffect } from 'react'
import { trackLpView } from '@/lib/gtag'

export function LpTracker({ lpName, ref: refParam, utmCampaign }: {
  lpName: string
  ref?: string
  utmCampaign?: string
}) {
  useEffect(() => {
    trackLpView({ lp_name: lpName, ref: refParam, utm_campaign: utmCampaign })
  }, [])
  return null
}
