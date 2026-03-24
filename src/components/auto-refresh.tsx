'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AutoRefresh({ interval = 5000 }: { interval?: number }) {
  const router = useRouter()
  
  useEffect(() => {
    const i = setInterval(() => {
      router.refresh()
    }, interval)
    return () => clearInterval(i)
  }, [router, interval])

  return null
}
