import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@envy/ui/components/popover'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { NewTeamDialog } from './new-team-dialog'

export function OrganizationSwitcher() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [newTeamOpen, setNewTeamOpen] = useState(false)
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const { data: organizations } = authClient.useListOrganizations()

  const orderedOrganizations = useMemo(
    () =>
      [...(organizations ?? [])].sort((a, b) => {
        const aType = a.type === 'personal' ? 0 : 1
        const bType = b.type === 'personal' ? 0 : 1
        return aType - bType || a.name.localeCompare(b.name)
      }),
    [organizations]
  )

  async function selectOrganization(organization: { slug: string }) {
    const result = await authClient.organization.setActive({
      organizationSlug: organization.slug
    })
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    setOpen(false)
    void navigate({
      to: '/org/$orgSlug',
      params: { orgSlug: organization.slug }
    })
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="ml-3 flex min-w-0 max-w-[190px] cursor-pointer items-center gap-2 rounded border border-ghost-border bg-surface-2 px-2.5 py-1.5 text-left transition-colors hover:border-border-focus"
            />
          }
        >
          <span className="truncate font-mono text-[11px] text-text-primary">
            {activeOrganization?.name ?? 'Select organization'}
          </span>
          <span className="text-[10px] text-text-muted">▾</span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] min-w-[230px] rounded border-ghost-border bg-[#111312] p-1.5 shadow-md"
        >
          <div className="px-2.5 py-1.5 font-mono text-[9px] tracking-[0.1em] text-text-muted">
            ORGANIZATIONS
          </div>
          {orderedOrganizations.map((organization) => {
            const active = organization.id === activeOrganization?.id
            return (
              <button
                key={organization.id}
                type="button"
                onClick={() => void selectOrganization(organization)}
                className={`flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-2 text-left font-mono text-[12px] transition-colors hover:bg-ghost-bg ${
                  active
                    ? 'bg-ghost-bg text-text-primary'
                    : 'text-text-secondary'
                }`}
              >
                <span className="truncate">{organization.name}</span>
                {organization.type === 'personal' ? (
                  <span className="rounded border border-brand/30 px-1 py-0.5 text-[9px] text-brand">
                    personal
                  </span>
                ) : null}
              </button>
            )
          })}
          <div className="my-1.5 border-t border-border" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setNewTeamOpen(true)
            }}
            className="flex w-full cursor-pointer items-center rounded px-2.5 py-2 text-left font-mono text-[11.5px] text-text-secondary transition-colors hover:bg-ghost-bg hover:text-text-primary"
          >
            + create new team
          </button>
        </PopoverContent>
      </Popover>
      <NewTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
        onCreated={(organization) => void selectOrganization(organization)}
      />
    </>
  )
}
