'use client'

import { Card, CardContent } from '@envy/ui/components/card'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const MotionCard = motion.create(Card)

interface FeatureCardProps {
  icon: IconSvgElement
  title: string
  description: string
  badge?: string
  className?: string
  children?: React.ReactNode
}

export function FeatureCard({
  icon,
  title,
  description,
  badge,
  className = '',
  children
}: FeatureCardProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <MotionCard
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className={`bg-surface border border-border rounded-3xl group hover:border-brand/30 transition-all overflow-hidden relative ring-0 gap-0 py-0 flex flex-col justify-between ${className}`}
    >
      <CardContent className="p-8 md:p-10">
        {badge && (
          <span className="inline-block px-3 py-1 bg-brand-dim text-brand text-[10px] font-bold uppercase tracking-wider rounded-full mb-4">
            {badge}
          </span>
        )}
        <div className="size-12 bg-brand-dim rounded-xl flex items-center justify-center text-brand mb-6 group-hover:scale-110 transition-transform">
          <HugeiconsIcon icon={icon} size={24} />
        </div>
        <h3 className="text-xl font-display font-semibold mb-3">{title}</h3>
        <p className="text-text-secondary text-[16px] leading-[1.75] mb-6">
          {description}
        </p>
      </CardContent>
      {children && (
        <div className="mt-auto px-6 sm:px-8 pb-8 pt-4 md:px-10 md:pb-10">
          {children}
        </div>
      )}
    </MotionCard>
  )
}
