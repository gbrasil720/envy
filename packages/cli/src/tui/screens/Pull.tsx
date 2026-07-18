import { Box, Text, useInput } from 'ink'
import { useEffect, useRef, useState } from 'react'
import { type PullSummary, runPull } from '../../core/services/pull'
import { ActionCard } from '../components/ActionCard'
import { Gap } from '../components/Gap'
import { ProgressBlock } from '../components/ProgressBlock'
import { ScreenChrome } from '../components/ScreenChrome'
import { TextInput } from '../components/TextInput'
import { inkColor, useTheme } from '../theme'

type PullProps = {
  onBack: () => void
  onSuccess?: () => void
}

type Phase =
  | 'running'
  | 'new-file'
  | 'select-target'
  | 'keep-local'
  | 'overwrite'
  | 'done'
  | 'empty'
  | 'error'

export function PullScreen({ onBack, onSuccess }: PullProps) {
  const theme = useTheme()
  const [phase, setPhase] = useState<Phase>('running')
  const [status, setStatus] = useState('fetching secrets…')
  const [files, setFiles] = useState<string[]>([])
  const [targetCursor, setTargetCursor] = useState(0)
  const [localOnly, setLocalOnly] = useState<string[]>([])
  const [summary, setSummary] = useState<PullSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [overwriteFile, setOverwriteFile] = useState('')
  const [keepChoice, setKeepChoice] = useState(1)
  const [owChoice, setOwChoice] = useState(1)

  const newFileRef = useRef<((v: string) => void) | null>(null)
  const targetRef = useRef<((v: string) => void) | null>(null)
  const keepRef = useRef<((v: boolean) => void) | null>(null)
  const overwriteRef = useRef<((v: boolean) => void) | null>(null)

  useInput((_input, key) => {
    if (
      (phase === 'done' || phase === 'empty' || phase === 'error') &&
      (key.return || key.escape)
    ) {
      onBack()
      return
    }

    if (phase === 'select-target') {
      if (key.escape) {
        onBack()
        return
      }
      // files + __new__
      const max = files.length
      if (key.upArrow) {
        setTargetCursor((i) => (i <= 0 ? max : i - 1))
        return
      }
      if (key.downArrow) {
        setTargetCursor((i) => (i >= max ? 0 : i + 1))
        return
      }
      if (key.return) {
        const r = targetRef.current
        targetRef.current = null
        if (targetCursor >= files.length) {
          setPhase('running')
          r?.('__new__')
          return
        }
        const f = files[targetCursor]
        if (!f) return
        setPhase('running')
        setStatus('writing…')
        r?.(f)
      }
      return
    }

    if (phase === 'keep-local') {
      if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
        setKeepChoice((c) => 1 - c)
        return
      }
      if (key.return) {
        const r = keepRef.current
        keepRef.current = null
        setPhase('running')
        setStatus('writing…')
        r?.(keepChoice === 1)
      }
      return
    }

    if (phase === 'overwrite') {
      if (key.escape) {
        overwriteRef.current?.(false)
        overwriteRef.current = null
        return
      }
      if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
        setOwChoice((c) => 1 - c)
        return
      }
      if (key.return) {
        const r = overwriteRef.current
        overwriteRef.current = null
        setPhase('running')
        setStatus(owChoice === 1 ? 'writing…' : 'aborting…')
        r?.(owChoice === 1)
      }
    }
  })

  useEffect(() => {
    let cancelled = false
    runPull(
      {},
      {
        promptNewFilename: () =>
          new Promise<string>((resolve) => {
            if (cancelled) return resolve('.env.local')
            newFileRef.current = resolve
            setPhase('new-file')
          }),
        selectTarget: (list) =>
          new Promise<string>((resolve) => {
            if (cancelled) return resolve(list[0] ?? '.env.local')
            setFiles(list)
            setTargetCursor(0)
            targetRef.current = resolve
            setPhase('select-target')
          }),
        confirmKeepLocal: (keys) =>
          new Promise<boolean>((resolve) => {
            if (cancelled) return resolve(true)
            setLocalOnly(keys)
            setKeepChoice(1)
            keepRef.current = resolve
            setPhase('keep-local')
          }),
        confirmOverwrite: (file) =>
          new Promise<boolean>((resolve) => {
            if (cancelled) return resolve(true)
            setOverwriteFile(file)
            setOwChoice(1)
            overwriteRef.current = resolve
            setPhase('overwrite')
          }),
        onSpinner: (m) => {
          if (!cancelled) {
            setStatus(m)
            setPhase('running')
          }
        },
        onStopSpinner: () => {},
        onEmpty: (env) => {
          if (!cancelled) {
            setMessage(`no secrets in "${env}" yet.`)
            setPhase('empty')
          }
        },
        onLocalOnly: () => {},
        onAbort: (reason) => {
          if (!cancelled) {
            setMessage(reason)
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
        setError(err instanceof Error ? err.message : 'Pull failed')
        setPhase('error')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (phase === 'new-file') {
    return (
      <ScreenChrome title="pull · new file" hints={[['esc', 'cancel']]}>
        <TextInput
          label="filename"
          defaultValue=".env.local"
          validate={(v) =>
            /^\.env(\.[a-z0-9._-]+)?$/i.test(v.trim())
              ? true
              : 'Must be a valid .env filename'
          }
          onCancel={() => {
            newFileRef.current?.('.env.local')
            onBack()
          }}
          onSubmit={(v) => {
            const r = newFileRef.current
            newFileRef.current = null
            setPhase('running')
            setStatus('writing…')
            r?.(v.trim())
          }}
        />
      </ScreenChrome>
    )
  }

  if (phase === 'select-target') {
    return (
      <ScreenChrome
        title="pull · write to"
        hints={[
          ['↑↓', 'select'],
          ['↵', 'write'],
          ['esc', 'back']
        ]}
      >
        <Box flexDirection="column" width={36}>
          {files.map((f, i) => {
            const sel = i === targetCursor
            return (
              <Text
                key={f}
                color={sel ? inkColor(theme.brand) : inkColor(theme.muted)}
                bold={sel}
              >
                {sel ? '❯ ' : '  '}
                {f}
              </Text>
            )
          })}
          <Text
            color={
              targetCursor >= files.length
                ? inkColor(theme.brand)
                : inkColor(theme.muted)
            }
            bold={targetCursor >= files.length}
          >
            {targetCursor >= files.length ? '❯ ' : '  '}+ create new file
          </Text>
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'keep-local') {
    return (
      <ScreenChrome
        title="local-only keys"
        hints={[
          ['←→', 'toggle'],
          ['↵', 'confirm']
        ]}
      >
        <Text color={inkColor(theme.warn)}>
          {localOnly.length} key(s) only on disk
        </Text>
        <Gap />
        <Box flexDirection="column" width={36}>
          {localOnly.slice(0, 8).map((k) => (
            <Text key={k} color={inkColor(theme.muted)} dimColor>
              {'  · '}
              {k}
            </Text>
          ))}
          {localOnly.length > 8 ? (
            <Text color={inkColor(theme.muted)} dimColor>
              {`  … +${localOnly.length - 8} more`}
            </Text>
          ) : null}
        </Box>
        <Gap lines={2} />
        <Box flexDirection="column" alignItems="center">
          <Box marginBottom={1}>
            <ActionCard
              title="O V E R W R I T E"
              subtitle="drop local-only keys"
              icon="!"
              selected={keepChoice === 0}
              width={28}
            />
          </Box>
          <ActionCard
            title="K E E P"
            subtitle="merge remote + local"
            icon="◎"
            selected={keepChoice === 1}
            width={28}
          />
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'overwrite') {
    return (
      <ScreenChrome
        title="overwrite?"
        hints={[
          ['←→', 'toggle'],
          ['↵', 'confirm'],
          ['esc', 'abort']
        ]}
      >
        <Text color={inkColor(theme.fg)}>
          replace <Text color={inkColor(theme.brand)}>{overwriteFile}</Text>?
        </Text>
        <Gap lines={2} />
        <Box flexDirection="column" alignItems="center">
          <Box marginBottom={1}>
            <ActionCard
              title="A B O R T"
              subtitle="keep file as-is"
              icon="◎"
              selected={owChoice === 0}
              width={26}
            />
          </Box>
          <ActionCard
            title="P U L L   I T"
            subtitle="write secrets"
            icon="◀"
            selected={owChoice === 1}
            width={26}
          />
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'done' && summary) {
    return (
      <ScreenChrome
        title="pulled."
        hints={[
          ['↵', 'home'],
          ['esc', 'home']
        ]}
      >
        <Text color={inkColor(theme.brand)} bold>
          ✓ {summary.secretsCount} secret(s) → {summary.file}
        </Text>
        <Gap />
        <Text color={inkColor(theme.muted)} dimColor>
          {summary.projectSlug} · {summary.environment}
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'empty') {
    return (
      <ScreenChrome
        title="pull"
        hints={[
          ['↵', 'home'],
          ['esc', 'home']
        ]}
      >
        <Text color={inkColor(theme.brand)} bold>
          {message}
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'error') {
    return (
      <ScreenChrome
        title="pull"
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
    <ScreenChrome title="pull">
      <ProgressBlock label={status} />
    </ScreenChrome>
  )
}
