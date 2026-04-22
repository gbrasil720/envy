import { cn } from '@envy/ui/lib/utils'
import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'

const SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  nav: 18,
  lg: 20
} as const

export type DashboardIconSize = keyof typeof SIZES

type Props = {
  icon: IconSvgElement
  size?: DashboardIconSize
  className?: string
} & Omit<ComponentProps<typeof HugeiconsIcon>, 'icon' | 'size'>

/** Consistent Hugeicons sizing + shrink for dashboard surfaces. */
export function DashboardIcon({
  icon,
  size = 'md',
  className,
  ...rest
}: Props) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={SIZES[size]}
      className={cn('shrink-0', className)}
      {...rest}
    />
  )
}
