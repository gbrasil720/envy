import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@envy/ui/components/alert-dialog'
import { Checkbox } from '@envy/ui/components/checkbox'
import { cn } from '@envy/ui/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'
import { invalidateSecretScope } from '@/utils/invalidateSecretScope'
import { useDashboardActions } from './dashboard-context'
import { SecretAddDialog } from './secret-add-dialog'
import { SecretEditDialog } from './secret-edit-dialog'

type Props = {
  projectId: string
  environments: { id: string; name: string }[]
  projectPlan?: string
}

export function SecretsTable({
  projectId,
  environments,
  projectPlan = 'free'
}: Props) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [currentEnv, setCurrentEnv] = useState(
    environments[0]?.name ?? 'development'
  )
  // Map of key → decrypted value (only populated on explicit reveal)
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({})
  const [revealAll, setRevealAll] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [editingSecret, setEditingSecret] = useState<{
    key: string
    value: string
  } | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [bulkDeleteKeys, setBulkDeleteKeys] = useState<string[] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const { registerOpenAddSecret } = useDashboardActions()

  useEffect(() => {
    registerOpenAddSecret(() => setAddOpen(true))
    return () => registerOpenAddSecret(null)
  }, [registerOpenAddSecret])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        setAddOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Default view: only keys, no decryption
  const keysQuery = useQuery(
    trpc.secrets.listKeys.queryOptions({ projectId, environment: currentEnv })
  )

  const envsListQuery = useQuery(
    trpc.environments.list.queryOptions({ projectId })
  )

  const envCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of envsListQuery.data ?? []) {
      map.set(e.id, e.secretsCount)
    }
    return map
  }, [envsListQuery.data])

  const revealMutation = useMutation({
    mutationFn: () =>
      queryClient.fetchQuery(
        trpc.secrets.reveal.queryOptions({ projectId, environment: currentEnv })
      ),
    onSuccess: (data) => {
      setRevealedValues((prev) => ({ ...prev, ...data.secrets }))
      setRevealAll(true)
    }
  })

  const deleteMutation = useMutation(
    trpc.secrets.delete.mutationOptions({
      onSuccess: () => {
        invalidateSecretScope(queryClient, projectId, currentEnv)
        queryClient.invalidateQueries(
          trpc.environments.list.queryOptions({ projectId })
        )
        setDeletingKey(null)
        setBulkDeleteKeys(null)
        setSelectedKeys(new Set())
      }
    })
  )

  const keys = keysQuery.data?.keys ?? []
  const isLoading = keysQuery.isLoading

  const secretEntries = useMemo(() => {
    return keys.map((key) => [key, revealedValues[key]] as [string, string | undefined])
  }, [keys, revealedValues])

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return secretEntries
    return secretEntries.filter(([k]) => k.toLowerCase().includes(q))
  }, [secretEntries, search])

  function isRevealed(key: string) {
    return revealAll || revealedValues.hasOwnProperty(key)
  }

  function toggleReveal(key: string) {
    if (revealAll) {
      setRevealAll(false)
      // Keep all other secrets visible; hide only the clicked one
      const next = { ...revealedValues }
      delete next[key]
      setRevealedValues(next)
    } else {
      // Reveal this single key by fetching from server
      if (!revealedValues.hasOwnProperty(key)) {
        // Optimistic: show masked, fetch in background
        void queryClient
          .fetchQuery(
            trpc.secrets.reveal.queryOptions({ projectId, environment: currentEnv })
          )
          .then((data) => {
            setRevealedValues((prev) => ({ ...prev, ...data.secrets }))
          })
      } else {
        // Hide this key
        const next = { ...revealedValues }
        delete next[key]
        setRevealedValues(next)
      }
    }
  }

  function handleEnvChange(env: string) {
    setCurrentEnv(env)
    setRevealedValues({})
    setRevealAll(false)
    setSelectedKeys(new Set())
    setSearch('')
  }

  function toggleSelectAll() {
    const keys = filteredEntries.map(([k]) => k)
    if (keys.every((k) => selectedKeys.has(k))) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(keys))
    }
  }

  function toggleSelectKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function copyText(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(msg)
    } catch {
      toast.error('Could not copy')
    }
  }

  function copyAsEnv() {
    const lines = filteredEntries.map(([k, v]) => {
      const val = isRevealed(k) ? (v ?? '***') : '***'
      const escaped = val.includes('\n') ? JSON.stringify(val) : val
      return `${k}=${escaped}`
    })
    void copyText(lines.join('\n'), 'Copied as .env')
  }

  async function runBulkDelete(keys: string[]) {
    await Promise.all(
      keys.map((key) =>
        deleteMutation.mutateAsync({
          projectId,
          environment: currentEnv,
          key
        })
      )
    )
    toast.success(
      keys.length === 1 ? 'Secret deleted' : `${keys.length} secrets deleted`
    )
  }

  const allFilteredSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every(([k]) => selectedKeys.has(k))

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-7">
        <div role="tablist" className="flex flex-wrap items-center">
          {environments.map((env) => {
            const isActive = currentEnv === env.name
            const count = isActive
              ? keys.length
              : (envCountMap.get(env.id) ?? 0)
            return (
              <button
                key={env.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleEnvChange(env.name)}
                className={cn(
                  'cursor-pointer border-b-2 px-3.5 py-3 font-mono text-[12px] transition-colors',
                  isActive
                    ? 'border-text-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                {env.name}{' '}
                <span className="text-[10px] text-text-muted">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 py-2 font-mono text-[10.5px] text-text-muted">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="filter…"
            aria-label="Filter secret keys"
            className="w-28 rounded border border-ghost-border bg-transparent px-2 py-1 text-[11px] text-text-primary outline-none placeholder:text-text-muted focus:border-border-focus sm:w-36"
          />
          <button
            type="button"
            onClick={() => {
              if (revealAll) {
                setRevealAll(false)
                setRevealedValues({})
              } else {
                revealMutation.mutate()
              }
            }}
            disabled={revealMutation.isPending}
            className="cursor-pointer transition-colors hover:text-text-primary disabled:opacity-40"
          >
            {revealMutation.isPending
              ? 'revealing…'
              : revealAll
                ? 'hide all'
                : 'show all'}
          </button>
          <button
            type="button"
            onClick={() => void copyAsEnv()}
            disabled={filteredEntries.length === 0}
            className="cursor-pointer transition-colors hover:text-text-primary disabled:opacity-40"
          >
            copy .env
          </button>
          {selectedKeys.size > 0 ? (
            <button
              type="button"
              onClick={() => setBulkDeleteKeys([...selectedKeys])}
              className="cursor-pointer text-danger transition-colors hover:text-danger/80"
            >
              del ({selectedKeys.size})
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[1.4fr_2fr_auto] gap-4 border-b border-ghost-divider px-7 py-2.5 font-mono text-[10px] tracking-[0.08em] text-text-muted sm:grid-cols-[1.6fr_2fr_1fr_.9fr_auto]">
        <span className="flex items-center gap-2">
          <Checkbox
            checked={allFilteredSelected && filteredEntries.length > 0}
            indeterminate={!allFilteredSelected && selectedKeys.size > 0}
            onCheckedChange={() => toggleSelectAll()}
            aria-label="Select all filtered secrets"
          />
          KEY
        </span>
        <span>VALUE</span>
        <span className="hidden sm:inline">UPDATED BY</span>
        <span className="hidden sm:inline">WHEN</span>
        <span />
      </div>

      <div className="flex-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <div key={i} className="border-b border-ghost-divider px-7 py-3.5">
              <div className="h-3.5 w-2/3 max-w-md animate-pulse rounded bg-ghost-bg" />
            </div>
          ))
        ) : filteredEntries.length === 0 && keys.length === 0 ? (
          <div className="px-7 py-16 text-center">
            <p className="mb-2 text-[15px] font-semibold text-text-primary">
              No secrets in {currentEnv}
            </p>
            <p className="mb-5 font-mono text-[12px] text-text-muted">
              $ envy push · or add a secret manually
            </p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="cursor-pointer rounded bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-white"
            >
              + add secret
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-7 py-10 text-center font-mono text-[12px] text-text-muted">
            no keys match &quot;{search}&quot;
          </div>
        ) : (
          filteredEntries.map(([key, value]) => {
            const shown = isRevealed(key)
            const displayValue = shown && value
              ? value
              : '•'.repeat(24)
            return (
              <div
                key={key}
                className="group grid grid-cols-[1.4fr_2fr_auto] items-center gap-4 border-b border-ghost-divider px-7 py-3 font-mono text-[12.5px] transition-colors hover:bg-ghost-bg sm:grid-cols-[1.6fr_2fr_1fr_.9fr_auto]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Checkbox
                    checked={selectedKeys.has(key)}
                    onCheckedChange={() => toggleSelectKey(key)}
                    aria-label={`Select ${key}`}
                  />
                  <span className="truncate text-text-primary">{key}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleReveal(key)}
                  className={cn(
                    'min-w-0 cursor-pointer truncate text-left transition-colors hover:text-text-primary',
                    shown ? 'text-text-primary' : 'text-text-muted'
                  )}
                  title={shown ? 'Hide value' : 'Reveal value'}
                >
                  {displayValue}
                </button>
                <span className="hidden text-[11px] text-text-secondary sm:inline">
                  —
                </span>
                <span className="hidden text-[10.5px] text-text-muted sm:inline">
                  —
                </span>
                <span className="flex gap-3 text-[10.5px] text-text-muted">
                  {shown && value ? (
                    <button
                      type="button"
                      onClick={() => void copyText(value, 'Value copied')}
                      className="cursor-pointer transition-colors hover:text-text-primary"
                    >
                      copy
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (shown && value) {
                        setEditingSecret({ key, value })
                      } else {
                        // Reveal first, then open edit
                        void queryClient
                          .fetchQuery(
                            trpc.secrets.reveal.queryOptions({ projectId, environment: currentEnv })
                          )
                          .then((data) => {
                            setRevealedValues((prev) => ({
                              ...prev,
                              ...data.secrets
                            }))
                            setEditingSecret({ key, value: data.secrets[key] ?? '' })
                          })
                      }
                    }}
                    className="cursor-pointer transition-colors hover:text-text-primary"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingKey(key)}
                    className="cursor-pointer transition-colors hover:text-danger"
                  >
                    del
                  </button>
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="px-7 py-3 font-mono text-[10.5px] text-text-muted">
        values are AES-256-GCM encrypted · revealed on demand
        {projectPlan === 'free' ? ' · free plan' : ''}
      </div>

      {editingSecret ? (
        <SecretEditDialog
          open
          onClose={() => setEditingSecret(null)}
          projectId={projectId}
          environment={currentEnv}
          secretKey={editingSecret.key}
          currentValue={editingSecret.value}
        />
      ) : null}

      {addOpen ? (
        <SecretAddDialog
          open
          onClose={() => setAddOpen(false)}
          projectId={projectId}
          environment={currentEnv}
        />
      ) : null}

      <AlertDialog
        open={!!deletingKey}
        onOpenChange={() => setDeletingKey(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <code className="rounded bg-muted px-1 font-mono text-sm">
                {deletingKey}
              </code>{' '}
              from {currentEnv}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deletingKey &&
                deleteMutation.mutate({
                  projectId,
                  environment: currentEnv,
                  key: deletingKey
                })
              }
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!bulkDeleteKeys}
        onOpenChange={() => setBulkDeleteKeys(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete secrets</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {bulkDeleteKeys?.length ?? 0} secret
              {(bulkDeleteKeys?.length ?? 0) !== 1 ? 's' : ''} from {currentEnv}
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                bulkDeleteKeys &&
                void runBulkDelete(bulkDeleteKeys).catch(() => {
                  toast.error('Some deletes failed')
                })
              }
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}