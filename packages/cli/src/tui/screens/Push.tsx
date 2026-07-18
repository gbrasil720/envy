import { Box, Text, useInput } from 'ink'
import { useEffect, useRef, useState } from 'react'
import { type KeyConflict, maskSecret } from '../../core/env-files'
import {
  type PushSummary,
  runPush,
  type SecretsDiff
} from '../../core/services/push'
import { ActionCard } from '../components/ActionCard'
import { DiffTheater } from '../components/DiffTheater'
import { Gap } from '../components/Gap'
import { ProgressBlock } from '../components/ProgressBlock'
import { ScreenChrome } from '../components/ScreenChrome'
import { inkColor, useTheme } from '../theme'

type PushProps = {
  onBack: () => void
  onSuccess?: () => void
}

type Phase =
  | 'running'
  | 'select-files'
  | 'conflict'
  | 'diff'
  | 'confirm'
  | 'done'
  | 'empty'
  | 'error'

export function PushScreen({ onBack, onSuccess }: PushProps) {
  const theme = useTheme()
  const [phase, setPhase] = useState<Phase>('running')
  const [status, setStatus] = useState('scanning .env*…')
  const [files, setFiles] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fileCursor, setFileCursor] = useState(0)
  const [conflict, setConflict] = useState<KeyConflict | null>(null)
  const [conflictCursor, setConflictCursor] = useState(0)
  const [diff, setDiff] = useState<SecretsDiff | null>(null)
  const [environment, setEnvironment] = useState('')
  const [summary, setSummary] = useState<PushSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmChoice, setConfirmChoice] = useState(1)

  const filesRef = useRef<((v: string[]) => void) | null>(null)
  const conflictRef = useRef<((v: string) => void) | null>(null)
  const confirmRef = useRef<((v: boolean) => void) | null>(null)

  useInput((input, key) => {
    if (
      (phase === 'done' || phase === 'empty' || phase === 'error') &&
      (key.return || key.escape)
    ) {
      onBack()
      return
    }

    if (phase === 'select-files') {
      if (key.escape) {
        filesRef.current?.([])
        filesRef.current = null
        return
      }
      // cursor over files + Continue row
      const max = files.length // last index = continue
      if (key.upArrow || input === 'k') {
        setFileCursor((i) => (i <= 0 ? max : i - 1))
        return
      }
      if (key.downArrow || input === 'j') {
        setFileCursor((i) => (i >= max ? 0 : i + 1))
        return
      }
      if (input === ' ' && fileCursor < files.length) {
        const f = files[fileCursor]
        if (!f) return
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(f)) next.delete(f)
          else next.add(f)
          return next
        })
        return
      }
      if (key.return) {
        if (fileCursor >= files.length) {
          // continue
          const chosen = files.filter((f) => selected.has(f))
          if (chosen.length === 0) return
          const r = filesRef.current
          filesRef.current = null
          setPhase('running')
          setStatus('comparing with remote…')
          r?.(chosen)
          return
        }
        // toggle file
        const f = files[fileCursor]
        if (!f) return
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(f)) next.delete(f)
          else next.add(f)
          return next
        })
      }
      if (input === 'c') {
        const chosen = files.filter((f) => selected.has(f))
        if (chosen.length === 0) return
        const r = filesRef.current
        filesRef.current = null
        setPhase('running')
        setStatus('comparing with remote…')
        r?.(chosen)
      }
      return
    }

    if (phase === 'conflict' && conflict) {
      if (key.upArrow) {
        setConflictCursor((i) => (i <= 0 ? conflict.files.length - 1 : i - 1))
        return
      }
      if (key.downArrow) {
        setConflictCursor((i) => (i >= conflict.files.length - 1 ? 0 : i + 1))
        return
      }
      if (key.return) {
        const value = conflict.values[conflictCursor] ?? ''
        const r = conflictRef.current
        conflictRef.current = null
        setConflict(null)
        setPhase('running')
        setStatus('resolving…')
        r?.(value)
      }
      return
    }

    if (phase === 'confirm') {
      if (key.escape) {
        confirmRef.current?.(false)
        confirmRef.current = null
        return
      }
      if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
        setConfirmChoice((c) => 1 - c)
        return
      }
      if (key.return) {
        const yes = confirmChoice === 1
        const r = confirmRef.current
        confirmRef.current = null
        setPhase('running')
        setStatus(yes ? 'encrypting & pushing…' : 'aborting…')
        r?.(yes)
      }
    }
  })

  useEffect(() => {
    let cancelled = false
    runPush(
      {},
      {
        selectFiles: (list) =>
          new Promise<string[]>((resolve) => {
            if (cancelled) return resolve([])
            setFiles(list)
            setSelected(new Set(list))
            setFileCursor(0)
            filesRef.current = resolve
            setPhase('select-files')
          }),
        resolveConflict: (c) =>
          new Promise<string>((resolve) => {
            if (cancelled) return resolve(c.values[0] ?? '')
            setConflict(c)
            setConflictCursor(0)
            conflictRef.current = resolve
            setPhase('conflict')
          }),
        confirm: () =>
          new Promise<boolean>((resolve) => {
            if (cancelled) return resolve(false)
            setConfirmChoice(1)
            confirmRef.current = resolve
            setPhase('confirm')
          }),
        onSpinner: (m) => {
          if (!cancelled) {
            setStatus(m)
            setPhase('running')
          }
        },
        onStopSpinner: () => {},
        onDiff: (d, env) => {
          if (!cancelled) {
            setDiff(d)
            setEnvironment(env)
            setPhase('diff')
          }
        },
        onWarn: () => {},
        onAbort: (reason) => {
          if (!cancelled) {
            setMessage(reason)
            setPhase('empty')
          }
        },
        onUpToDate: () => {
          if (!cancelled) {
            setMessage('everything is already in sync.')
            setPhase('empty')
          }
        },
        onSuccess: (s) => {
          if (!cancelled) {
            setSummary(s)
            setPhase('done')
            onSuccess?.()
          }
        }
      }
    ).catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Push failed')
        setPhase('error')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (phase === 'select-files') {
    return (
      <ScreenChrome
        title="push · pick files"
        hints={[
          ['space/↵', 'toggle'],
          ['c', 'continue'],
          ['esc', 'abort']
        ]}
      >
        <Box flexDirection="column" width={36}>
          {files.map((f, i) => {
            const on = selected.has(f)
            const sel = i === fileCursor
            return (
              <Text key={f}>
                <Text
                  color={sel ? inkColor(theme.brand) : inkColor(theme.muted)}
                  bold={sel}
                >
                  {sel ? '❯ ' : '  '}
                  {on ? '[x]' : '[ ]'} {f}
                </Text>
              </Text>
            )
          })}
          <Gap />
          <Text
            color={
              fileCursor >= files.length
                ? inkColor(theme.brand)
                : inkColor(theme.muted)
            }
            bold={fileCursor >= files.length}
          >
            {fileCursor >= files.length ? '❯ ' : '  '}
            continue →
          </Text>
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'conflict' && conflict) {
    return (
      <ScreenChrome
        title={`conflict · ${conflict.key}`}
        hints={[
          ['↑↓', 'choose'],
          ['↵', 'use value']
        ]}
      >
        <Box flexDirection="column" width={44}>
          {conflict.files.map((file, i) => {
            const sel = i === conflictCursor
            return (
              <Text key={`${file}-${i}`}>
                <Text
                  color={sel ? inkColor(theme.brand) : inkColor(theme.muted)}
                  bold={sel}
                >
                  {sel ? '❯ ' : '  '}
                  {file}{' '}
                </Text>
                <Text color={inkColor(theme.warn)}>
                  {maskSecret(conflict.values[i] ?? '')}
                </Text>
              </Text>
            )
          })}
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'diff' && diff) {
    // Brief display while service moves to confirm
    return (
      <ScreenChrome title="push · diff">
        <DiffTheater diff={diff} environment={environment} />
        <Gap />
        <ProgressBlock label="preparing confirm…" />
      </ScreenChrome>
    )
  }

  if (phase === 'confirm') {
    return (
      <ScreenChrome
        title="push it?"
        hints={[
          ['←→', 'toggle'],
          ['↵', 'confirm'],
          ['esc', 'abort']
        ]}
      >
        {diff ? (
          <>
            <DiffTheater diff={diff} environment={environment} />
            <Gap lines={2} />
          </>
        ) : null}
        <Box flexDirection="column" alignItems="center">
          <Box marginBottom={1}>
            <ActionCard
              title="A B O R T"
              subtitle="don't push"
              icon="◎"
              selected={confirmChoice === 0}
              width={26}
            />
          </Box>
          <ActionCard
            title="P U S H   I T"
            subtitle={environment ? `→ ${environment}` : 'upload secrets'}
            icon="▶"
            selected={confirmChoice === 1}
            width={26}
          />
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'done' && summary) {
    return (
      <ScreenChrome
        title="synced."
        hints={[
          ['↵', 'home'],
          ['esc', 'home']
        ]}
      >
        <Text color={inkColor(theme.brand)} bold>
          ✓ {summary.upserted} secret(s) pushed
        </Text>
        <Gap />
        <Text color={inkColor(theme.muted)} dimColor>
          {summary.projectSlug} · {summary.environment}
        </Text>
        <Text color={inkColor(theme.muted)} dimColor>
          {summary.files.join(', ')}
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'empty') {
    return (
      <ScreenChrome
        title="push"
        hints={[
          ['↵', 'home'],
          ['esc', 'home']
        ]}
      >
        <Text color={inkColor(theme.brand)} bold>
          {message ?? 'done.'}
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'error') {
    return (
      <ScreenChrome
        title="push"
        hints={[
          ['↵', 'home'],
          ['esc', 'home']
        ]}
      >
        <Text color={inkColor(theme.danger)} bold>
          ✗ {error}
        </Text>
      </ScreenChrome>
    )
  }

  return (
    <ScreenChrome title="push">
      <ProgressBlock label={status} />
    </ScreenChrome>
  )
}
