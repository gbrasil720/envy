import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useRef, useState } from 'react'
import { CONFIG_FILENAME } from '../../core/constants'
import { runInit } from '../../core/services/init'
import type { ProjectRow } from '../../core/services/projects'
import { ActionCard } from '../components/ActionCard'
import { Gap } from '../components/Gap'
import { ScreenChrome } from '../components/ScreenChrome'
import { TextInput } from '../components/TextInput'
import { inkColor, useTheme } from '../theme'

type InitProps = {
  onBack: () => void
  onLinked: () => void
}

type Phase =
  | 'mode'
  | 'overwrite'
  | 'name'
  | 'select-project'
  | 'environment'
  | 'working'
  | 'done'
  | 'error'

const ENVS = ['development', 'staging', 'production'] as const

export function InitScreen({ onBack, onLinked }: InitProps) {
  const theme = useTheme()
  const [phase, setPhase] = useState<Phase>('mode')
  const [create, setCreate] = useState(false)
  const [modeIndex, setModeIndex] = useState(0)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [projIndex, setProjIndex] = useState(0)
  const [envIndex, setEnvIndex] = useState(0)
  const [owChoice, setOwChoice] = useState(0)
  const [result, setResult] = useState<{
    projectName: string
    projectSlug: string
    environment: string
    gitignoreNote: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const overwriteRef = useRef<((v: boolean) => void) | null>(null)
  const nameRef = useRef<((v: string) => void) | null>(null)
  const projectRef = useRef<((v: ProjectRow) => void) | null>(null)
  const envRef = useRef<((v: string) => void) | null>(null)

  useInput((input, key) => {
    if ((phase === 'done' || phase === 'error') && (key.return || key.escape)) {
      if (phase === 'done') onLinked()
      else onBack()
      return
    }

    if (phase === 'mode') {
      if (key.escape) {
        onBack()
        return
      }
      if (key.upArrow || key.downArrow) {
        setModeIndex((i) => (i === 0 ? 1 : 0))
        return
      }
      if (key.return || input === 's' || input === 'c') {
        const createMode =
          input === 'c' ? true : input === 's' ? false : modeIndex === 1
        startInit(createMode)
      }
      return
    }

    if (phase === 'overwrite') {
      if (key.escape) {
        overwriteRef.current?.(false)
        return
      }
      if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
        setOwChoice((c) => 1 - c)
        return
      }
      if (key.return) {
        const r = overwriteRef.current
        overwriteRef.current = null
        setPhase('working')
        r?.(owChoice === 1)
      }
      return
    }

    if (phase === 'select-project') {
      if (key.escape) {
        onBack()
        return
      }
      if (key.upArrow) {
        setProjIndex((i) => (i <= 0 ? projects.length - 1 : i - 1))
        return
      }
      if (key.downArrow) {
        setProjIndex((i) => (i >= projects.length - 1 ? 0 : i + 1))
        return
      }
      if (key.return) {
        const p = projects[projIndex]
        if (!p) return
        const r = projectRef.current
        projectRef.current = null
        setPhase('working')
        r?.(p)
      }
      return
    }

    if (phase === 'environment') {
      if (key.escape) {
        onBack()
        return
      }
      if (key.upArrow) {
        setEnvIndex((i) => (i <= 0 ? ENVS.length - 1 : i - 1))
        return
      }
      if (key.downArrow) {
        setEnvIndex((i) => (i >= ENVS.length - 1 ? 0 : i + 1))
        return
      }
      if (key.return) {
        const env = ENVS[envIndex] ?? 'development'
        const r = envRef.current
        envRef.current = null
        setPhase('working')
        r?.(env)
      }
    }
  })

  const startInit = (createMode: boolean) => {
    setCreate(createMode)
    setPhase('working')
    runInit(
      { create: createMode },
      {
        confirmOverwrite: () =>
          new Promise<boolean>((resolve) => {
            overwriteRef.current = resolve
            setOwChoice(0)
            setPhase('overwrite')
          }),
        promptProjectName: () =>
          new Promise<string>((resolve) => {
            nameRef.current = resolve
            setPhase('name')
          }),
        selectProject: (list) =>
          new Promise<ProjectRow>((resolve) => {
            setProjects(list)
            setProjIndex(0)
            projectRef.current = resolve
            setPhase('select-project')
          }),
        selectEnvironment: () =>
          new Promise<string>((resolve) => {
            setEnvIndex(0)
            envRef.current = resolve
            setPhase('environment')
          })
      }
    )
      .then((r) => {
        if (!r) {
          onBack()
          return
        }
        setResult(r)
        setPhase('done')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Init failed')
        setPhase('error')
      })
  }

  if (phase === 'mode') {
    return (
      <ScreenChrome
        title="init · link directory"
        hints={[
          ['↑↓', 'select'],
          ['↵', 'go'],
          ['esc', 'back']
        ]}
      >
        <Box flexDirection="column" alignItems="center">
          <Box marginBottom={1}>
            <ActionCard
              title="S E L E C T"
              subtitle="pick an existing project"
              icon="◎"
              selected={modeIndex === 0}
            />
          </Box>
          <ActionCard
            title="C R E A T E"
            subtitle="new project + link here"
            icon="+"
            selected={modeIndex === 1}
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
        <Text color={inkColor(theme.warn)}>
          {CONFIG_FILENAME} already exists
        </Text>
        <Gap lines={2} />
        <Box flexDirection="column" alignItems="center">
          <Box marginBottom={1}>
            <ActionCard
              title="K E E P"
              subtitle="don't overwrite"
              icon="◎"
              selected={owChoice === 0}
              width={26}
            />
          </Box>
          <ActionCard
            title="R E P L A C E"
            subtitle="write new config"
            icon="!"
            selected={owChoice === 1}
            width={26}
          />
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'name') {
    return (
      <ScreenChrome title="create project" hints={[['esc', 'cancel']]}>
        <TextInput
          label="name"
          validate={(v) => (v.trim() ? true : 'Name is required')}
          onCancel={() => {
            nameRef.current?.('')
            onBack()
          }}
          onSubmit={(name) => {
            const r = nameRef.current
            nameRef.current = null
            setPhase('working')
            r?.(name)
          }}
        />
      </ScreenChrome>
    )
  }

  if (phase === 'select-project') {
    return (
      <ScreenChrome
        title="select project"
        hints={[
          ['↑↓', 'select'],
          ['↵', 'link'],
          ['esc', 'back']
        ]}
      >
        <Box flexDirection="column" width={40}>
          {projects.map((p, i) => {
            const sel = i === projIndex
            return (
              <Text key={p.id}>
                <Text
                  color={sel ? inkColor(theme.brand) : inkColor(theme.muted)}
                  bold={sel}
                >
                  {sel ? '❯ ' : '  '}
                  {p.name}
                </Text>
                {p.name !== p.slug ? (
                  <Text color={inkColor(theme.muted)} dimColor>
                    {`  ${p.slug}`}
                  </Text>
                ) : null}
              </Text>
            )
          })}
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'environment') {
    return (
      <ScreenChrome
        title="default environment"
        hints={[
          ['↑↓', 'select'],
          ['↵', 'save']
        ]}
      >
        <Box flexDirection="column" width={28}>
          {ENVS.map((e, i) => {
            const sel = i === envIndex
            return (
              <Text
                key={e}
                color={sel ? inkColor(theme.brand) : inkColor(theme.muted)}
                bold={sel}
              >
                {sel ? '❯ ' : '  '}
                {e}
              </Text>
            )
          })}
        </Box>
      </ScreenChrome>
    )
  }

  if (phase === 'working') {
    return (
      <ScreenChrome title="init">
        <Text>
          <Text color={inkColor(theme.brand)}>
            <Spinner type="dots" />
          </Text>
          <Text color={inkColor(theme.muted)}>
            {create ? '  creating…' : '  linking…'}
          </Text>
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'error') {
    return (
      <ScreenChrome
        title="init"
        hints={[
          ['↵', 'back'],
          ['esc', 'back']
        ]}
      >
        <Text color={inkColor(theme.danger)} bold>
          ✗ {error}
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'done' && result) {
    return (
      <ScreenChrome
        title="linked."
        hints={[
          ['↵', 'home'],
          ['esc', 'home']
        ]}
      >
        <Box flexDirection="column" alignItems="center">
          <Text color={inkColor(theme.brand)} bold>
            directory linked to envy
          </Text>
          <Gap />
          <Text>
            <Text color={inkColor(theme.muted)} dimColor>
              {'project  '}
            </Text>
            <Text color={inkColor(theme.brand)}>{result.projectName}</Text>
          </Text>
          <Text>
            <Text color={inkColor(theme.muted)} dimColor>
              {'slug     '}
            </Text>
            <Text color={inkColor(theme.fg)}>{result.projectSlug}</Text>
          </Text>
          <Text>
            <Text color={inkColor(theme.muted)} dimColor>
              {'env      '}
            </Text>
            <Text color={inkColor(theme.fg)}>{result.environment}</Text>
          </Text>
          {result.gitignoreNote === 'missing' ? (
            <>
              <Gap />
              <Text color={inkColor(theme.warn)}>
                no .gitignore — add {CONFIG_FILENAME} manually
              </Text>
            </>
          ) : null}
        </Box>
      </ScreenChrome>
    )
  }

  return (
    <ScreenChrome title="init">
      <Text>
        <Text color={inkColor(theme.brand)}>
          <Spinner type="dots" />
        </Text>
      </Text>
    </ScreenChrome>
  )
}
