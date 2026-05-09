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
import { Badge } from '@envy/ui/components/badge'
import { Button } from '@envy/ui/components/button'
import { Checkbox } from '@envy/ui/components/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@envy/ui/components/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@envy/ui/components/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@envy/ui/components/table'
import { Tabs, TabsList, TabsTrigger } from '@envy/ui/components/tabs'
import { ToggleGroup, ToggleGroupItem } from '@envy/ui/components/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@envy/ui/components/tooltip'
import {
  Copy01Icon,
  Delete01Icon,
  FileCodeIcon,
  PencilEdit01Icon,
  PlusSignIcon,
  Search01Icon,
  ViewIcon,
  ViewOffIcon
} from '@hugeicons/core-free-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/utils/trpc'
import { DashboardIcon } from './dashboard-icon'
import { SecretAddDialog } from './secret-add-dialog'
import { SecretEditDialog } from './secret-edit-dialog'
import { SecretsStats } from './secrets-stats'

type Props = {
  projectId: string
  environments: { id: string; name: string }[]
  projectPlan?: string
}

function maskValue(value: string, revealed: boolean) {
  if (revealed) return value
  return '•'.repeat(Math.min(value.length, 24))
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
  const revealed = useRef<Set<string>>(new Set())
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

  const secretsQuery = useQuery(
    trpc.secrets.reveal.queryOptions({ projectId, environment: currentEnv })
  )

  const deleteMutation = useMutation(
    trpc.secrets.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.secrets.reveal.queryOptions({
            projectId,
            environment: currentEnv
          })
        )
        queryClient.invalidateQueries(
          trpc.auditLog.list.queryOptions({ projectId, limit: 50 })
        )
        setDeletingKey(null)
        setBulkDeleteKeys(null)
        setSelectedKeys(new Set())
      }
    })
  )

  const secrets = secretsQuery.data?.secrets ?? {}
  const secretEntries = Object.entries(secrets) as [string, string][]

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return secretEntries
    return secretEntries.filter(([k]) => k.toLowerCase().includes(q))
  }, [secretEntries, search])

  function isRevealed(key: string) {
    return revealAll || revealed.current.has(key)
  }

  function toggleReveal(key: string) {
    setRevealAll(false)
    if (revealed.current.has(key)) {
      revealed.current.delete(key)
    } else {
      revealed.current.add(key)
    }
  }

  function handleEnvChange(env: string) {
    setCurrentEnv(env)
    revealed.current.clear()
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
      const val = isRevealed(k) ? v : '***'
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
    <div className="flex flex-col gap-5">
      <SecretsStats
        projectId={projectId}
        environment={currentEnv}
        secretCount={secretEntries.length}
        projectPlan={projectPlan}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <Tabs value={currentEnv} onValueChange={handleEnvChange}>
          <TabsList className="h-9 flex-wrap gap-0">
            {environments.map((env) => (
              <TabsTrigger
                key={env.id}
                value={env.name}
                className="gap-1.5 px-3 font-mono text-xs"
              >
                {env.name}
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1 font-mono text-[10px] tabular-nums"
                >
                  {env.name === currentEnv ? secretEntries.length : '—'}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="h-9 w-full min-w-[200px] max-w-sm">
            <InputGroupAddon align="inline-start">
              <DashboardIcon
                icon={Search01Icon}
                size="md"
                className="opacity-50"
              />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Filter keys…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter secret keys"
            />
          </InputGroup>
          <ToggleGroup
            value={revealAll ? (['show'] as const) : (['hide'] as const)}
            onValueChange={(groupValue) => {
              const v = groupValue[0]
              if (v === 'show') {
                setRevealAll(true)
                revealed.current.clear()
              } else {
                setRevealAll(false)
                revealed.current.clear()
              }
            }}
            variant="outline"
            size="sm"
            className="min-h-9"
          >
            <ToggleGroupItem value="hide" aria-label="Hide all values">
              Hide
            </ToggleGroupItem>
            <ToggleGroupItem value="show" aria-label="Show all values">
              Show
            </ToggleGroupItem>
          </ToggleGroup>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => void copyAsEnv()}
                  disabled={filteredEntries.length === 0}
                />
              }
            >
              <DashboardIcon
                icon={FileCodeIcon}
                size="sm"
                data-icon="inline-start"
              />
              Copy .env
            </TooltipTrigger>
            <TooltipContent>
              Copy visible keys as KEY=VALUE (masked if hidden)
            </TooltipContent>
          </Tooltip>
          {selectedKeys.size > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-9"
              onClick={() => setBulkDeleteKeys([...selectedKeys])}
            >
              Delete ({selectedKeys.size})
            </Button>
          ) : null}
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <DashboardIcon
              icon={PlusSignIcon}
              size="sm"
              data-icon="inline-start"
            />
            Add secret
            <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground sm:inline">
              N
            </kbd>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allFilteredSelected && filteredEntries.length > 0}
                  indeterminate={!allFilteredSelected && selectedKeys.size > 0}
                  onCheckedChange={() => toggleSelectAll()}
                  aria-label="Select all filtered secrets"
                />
              </TableHead>
              <TableHead className="w-[32%] text-xs font-medium text-muted-foreground">
                Key
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Value
              </TableHead>
              <TableHead className="w-[72px] text-right text-xs font-medium text-muted-foreground">
                Len
              </TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {secretsQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredEntries.length === 0 && secretEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <Empty className="border-0 py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="default">
                        <DashboardIcon icon={FileCodeIcon} size="lg" />
                      </EmptyMedia>
                      <EmptyTitle>No secrets in {currentEnv}</EmptyTitle>
                      <EmptyDescription>
                        Push from the CLI with{' '}
                        <code className="rounded bg-muted px-1 font-mono text-[11px]">
                          envy push
                        </code>{' '}
                        or add a secret manually.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button size="sm" onClick={() => setAddOpen(true)}>
                        Add secret
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No keys match &quot;{search}&quot;
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map(([key, value]) => {
                const shown = isRevealed(key)
                return (
                  <TableRow key={key} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selectedKeys.has(key)}
                        onCheckedChange={() => toggleSelectKey(key)}
                        aria-label={`Select ${key}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      <div className="flex items-center gap-1">
                        <span className="min-w-0 truncate">{key}</span>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() => void copyText(key, 'Key copied')}
                              />
                            }
                          >
                            <DashboardIcon icon={Copy01Icon} size="sm" />
                          </TooltipTrigger>
                          <TooltipContent>Copy key</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 break-all font-mono text-xs text-muted-foreground">
                          {maskValue(value, shown ?? false)}
                        </span>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0"
                                onClick={() => toggleReveal(key)}
                                aria-label={shown ? 'Hide value' : 'Show value'}
                              />
                            }
                          >
                            {shown ? (
                              <DashboardIcon icon={ViewOffIcon} size="sm" />
                            ) : (
                              <DashboardIcon icon={ViewIcon} size="sm" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {shown ? 'Hide value' : 'Show value'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0"
                                onClick={() =>
                                  void copyText(value, 'Value copied')
                                }
                                aria-label="Copy value"
                              />
                            }
                          >
                            <DashboardIcon icon={Copy01Icon} size="sm" />
                          </TooltipTrigger>
                          <TooltipContent>Copy value</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                      {value.length}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  setEditingSecret({
                                    key,
                                    value: value as string
                                  })
                                }
                                aria-label="Edit secret"
                              />
                            }
                          >
                            <DashboardIcon icon={PencilEdit01Icon} size="sm" />
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setDeletingKey(key)}
                                aria-label="Delete secret"
                              />
                            }
                          >
                            <DashboardIcon icon={Delete01Icon} size="sm" />
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {secretEntries.length > 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-mono text-[10px]">
            {filteredEntries.length === secretEntries.length
              ? `${secretEntries.length} secret${secretEntries.length !== 1 ? 's' : ''}`
              : `${filteredEntries.length} of ${secretEntries.length} shown`}
          </Badge>
          <span>in {currentEnv}</span>
        </div>
      ) : null}

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
