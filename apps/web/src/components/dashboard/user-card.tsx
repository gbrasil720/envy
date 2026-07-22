import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@envy/ui/components/dropdown-menu'
import { Skeleton } from '@envy/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useTRPC } from '@/utils/trpc'
import { PreferencesSheet } from './preferences-sheet'

type Props = {
  planLabel: string
  compact?: boolean
}

function initials(name: string | null | undefined, email: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '??'
}

export function UserCard({ planLabel, compact = false }: Props) {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const meQuery = useQuery(trpc.me.get.queryOptions())
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  if (meQuery.isLoading) {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-[26px] rounded" />
        {!compact ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        ) : null}
      </div>
    )
  }

  const user = meQuery.data
  if (!user) {
    return (
      <p className="font-mono text-[11px] text-text-muted">Not signed in</p>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Account menu for ${user.name ?? 'user'}`}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded p-1 text-left transition-colors hover:bg-ghost-bg"
            />
          }
        >
          <span className="flex size-[26px] shrink-0 items-center justify-center rounded bg-ghost-bg font-mono text-[10px] text-text-primary">
            {initials(user.name, user.email)}
          </span>
          {!compact ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold leading-tight text-text-primary">
                {user.name ?? 'Account'}
              </div>
              <div className="truncate font-mono text-[9.5px] text-text-muted">
                {planLabel}
              </div>
            </div>
          ) : null}
          <span className="text-[10px] text-text-muted">⚙</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-52 rounded border-ghost-border bg-[#111312]"
          align="start"
          side="top"
        >
          <div className="px-2 py-2">
            <div className="text-[13px] font-medium text-text-primary">
              {user.name}
            </div>
            <div className="font-mono text-[11px] text-text-muted">
              {user.email}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
            Preferences
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              window.open(
                'https://docs.useenvy.dev',
                '_blank',
                'noopener,noreferrer'
              )
            }}
          >
            Docs ↗
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => navigate({ to: '/' })
                }
              })
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PreferencesSheet
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  )
}
