'use client'

import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

export function LeakCounter() {
  const [count, setCount] = useState(142850)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 3) + 1)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mb-8 flex w-fit max-w-full min-w-0 flex-wrap items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] font-bold text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)] sm:text-xs"
    >
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-white sm:gap-2 sm:px-2 sm:text-[10px]">
        <span className="relative flex size-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full size-1.5 bg-white"></span>
        </span>
        Live
      </div>
      <span className="font-mono">{count.toLocaleString()}</span>
      <span className="text-red-500/80 font-medium">
        <span className="hidden sm:inline">
          secrets exposed on GitHub today
        </span>
        <span className="sm:hidden">leaked on GitHub today</span>
      </span>
    </motion.div>
  )
}
