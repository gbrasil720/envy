import { Avatar, AvatarFallback, AvatarImage } from '@envy/ui/components/avatar'
import { Button } from '@envy/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@envy/ui/components/dropdown-menu'
import { Skeleton } from '@envy/ui/components/skeleton'
import {
  ArrowUpRight01Icon,
  BookOpen01Icon,
  Logout01Icon,
  Settings01Icon
} from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'
import { PreferencesSheet } from './preferences-sheet'

type Props = {
  planLabel: string
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

export function UserCard({ planLabel }: Props) {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const meQuery = useQuery(trpc.me.get.queryOptions())
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  if (meQuery.isLoading) {
    return (
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
    )
  }

  const user = meQuery.data
  if (!user) {
    return (
      <p className="px-2.5 py-2 text-xs text-muted-foreground">Not signed in</p>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2.5 px-2.5 py-2 font-normal"
            />
          }
        >
          <Avatar className="size-8 shrink-0">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="bg-brand/15 text-[10px] font-semibold text-brand">
              {initials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-medium">
              {user.name ?? 'Account'}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {planLabel}
            </p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start" side="top">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
              <DashboardIcon icon={Settings01Icon} data-icon="inline-start" />
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
              <DashboardIcon icon={BookOpen01Icon} data-icon="inline-start" />
              Docs
              <DashboardIcon
                icon={ArrowUpRight01Icon}
                size="sm"
                className="ml-auto opacity-50"
                aria-hidden
              />
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
              <DashboardIcon icon={Logout01Icon} data-icon="inline-start" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <PreferencesSheet
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  )
}
