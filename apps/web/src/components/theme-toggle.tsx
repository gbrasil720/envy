import { Button } from '@envy/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@envy/ui/components/dropdown-menu'
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTheme } from '@/components/theme-provider'

const menuItemClassName =
  'cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary outline-none hover:bg-ghost-bg/70 focus:bg-ghost-bg focus:text-text-primary data-highlighted:bg-ghost-bg data-highlighted:text-text-primary'

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl border border-ghost-divider/35 bg-transparent text-text-secondary cursor-pointer hover:text-text-primary shadow-none transition-colors hover:border-ghost-divider/55 hover:bg-ghost-bg/65 dark:border-ghost-divider/25 dark:bg-transparent dark:hover:bg-ghost-bg/45"
        >
          <HugeiconsIcon
            icon={Sun03Icon}
            className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
          />
          <HugeiconsIcon
            icon={Moon02Icon}
            className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-40 rounded-xl border border-ghost-divider/70 bg-bg/72 p-1 shadow-[0_10px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl backdrop-saturate-150 ring-0 dark:border-white/12 dark:bg-surface dark:shadow-[0_16px_56px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.07)_inset] dark:backdrop-blur-md"
      >
        <DropdownMenuItem
          className={menuItemClassName}
          onClick={() => setTheme('light')}
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          className={menuItemClassName}
          onClick={() => setTheme('dark')}
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          className={menuItemClassName}
          onClick={() => setTheme('system')}
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
