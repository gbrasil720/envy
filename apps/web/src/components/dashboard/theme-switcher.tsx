import { cn } from '@envy/ui/lib/utils'
import {
  AiComputerIcon,
  Moon02Icon,
  Sun03Icon
} from '@hugeicons/core-free-icons'
import { useTheme } from '../theme-provider'
import { DashboardIcon } from './dashboard-icon'
import { ThemePreview } from './theme-preview'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const options = [
    { id: 'light' as const, label: 'Light', icon: Sun03Icon },
    { id: 'dark' as const, label: 'Dark', icon: Moon02Icon },
    { id: 'system' as const, label: 'System', icon: AiComputerIcon }
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const selected = theme === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-brand/40 bg-brand/10 text-brand ring-1 ring-brand/20'
                : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )}
          >
            <ThemePreview mode={option.id} />
            <div className="flex flex-col items-center gap-0.5">
              <DashboardIcon icon={option.icon} size="xs" />
              <span className="text-[10px] font-medium leading-none">
                {option.label}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
