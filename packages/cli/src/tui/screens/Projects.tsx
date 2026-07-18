import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { useCallback, useEffect, useState } from 'react'
import { formatRelativeTime } from '../../core/format'
import {
  createProject,
  listProjects,
  type ProjectRow
} from '../../core/services/projects'
import { Gap } from '../components/Gap'
import { Panel } from '../components/Panel'
import { ScreenChrome } from '../components/ScreenChrome'
import { TextInput } from '../components/TextInput'
import { inkColor, useTheme } from '../theme'

type ProjectsProps = {
  onBack: () => void
}

type Phase = 'list' | 'create' | 'creating' | 'created' | 'error'

export function ProjectsScreen({ onBack }: ProjectsProps) {
  const theme = useTheme()
  const [phase, setPhase] = useState<Phase>('list')
  const [projects, setProjects] = useState<ProjectRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; slug: string } | null>(
    null
  )
  const [cursor, setCursor] = useState(0)

  const reload = useCallback(() => {
    setProjects(null)
    listProjects()
      .then(setProjects)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed')
        setPhase('error')
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useInput((input, key) => {
    if (phase === 'list') {
      if (key.escape || input === 'q') {
        onBack()
        return
      }
      if (input === 'n') {
        setPhase('create')
        return
      }
      if (projects && projects.length > 0) {
        if (key.upArrow || input === 'k') {
          setCursor((i) => (i <= 0 ? projects.length - 1 : i - 1))
        }
        if (key.downArrow || input === 'j') {
          setCursor((i) => (i >= projects.length - 1 ? 0 : i + 1))
        }
      }
      return
    }
    if (
      (phase === 'created' || phase === 'error') &&
      (key.return || key.escape)
    ) {
      if (phase === 'created') {
        setPhase('list')
        reload()
      } else onBack()
    }
  })

  if (phase === 'error') {
    return (
      <ScreenChrome
        title="projects"
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

  if (phase === 'create') {
    return (
      <ScreenChrome title="create project" hints={[['esc', 'cancel']]}>
        <TextInput
          label="name"
          validate={(v) => (v.trim() ? true : 'Name is required')}
          onCancel={() => setPhase('list')}
          onSubmit={async (name) => {
            setPhase('creating')
            try {
              const p = await createProject(name)
              setCreated({ name: p.name, slug: p.slug })
              setPhase('created')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Create failed')
              setPhase('error')
            }
          }}
        />
      </ScreenChrome>
    )
  }

  if (phase === 'creating') {
    return (
      <ScreenChrome title="projects">
        <Text>
          <Text color={inkColor(theme.brand)}>
            <Spinner type="dots" />
          </Text>
          <Text color={inkColor(theme.muted)}> creating…</Text>
        </Text>
      </ScreenChrome>
    )
  }

  if (phase === 'created' && created) {
    return (
      <ScreenChrome
        title="created."
        hints={[
          ['↵', 'list'],
          ['esc', 'list']
        ]}
      >
        <Text color={inkColor(theme.brand)} bold>
          {created.name}
        </Text>
        <Text color={inkColor(theme.muted)} dimColor>
          {created.slug}
        </Text>
      </ScreenChrome>
    )
  }

  if (!projects) {
    return (
      <ScreenChrome title="projects">
        <Text>
          <Text color={inkColor(theme.brand)}>
            <Spinner type="dots" />
          </Text>
          <Text color={inkColor(theme.muted)}> fetching…</Text>
        </Text>
      </ScreenChrome>
    )
  }

  if (projects.length === 0) {
    return (
      <ScreenChrome
        title="projects"
        hints={[
          ['n', 'create'],
          ['esc', 'back']
        ]}
      >
        <Text color={inkColor(theme.muted)} dimColor>
          no projects yet.
        </Text>
        <Gap />
        <Text color={inkColor(theme.brand)}>press n to create one</Text>
      </ScreenChrome>
    )
  }

  const safeCursor = Math.min(cursor, projects.length - 1)

  return (
    <ScreenChrome
      title={`projects · ${projects.length}`}
      hints={[
        ['↑↓', 'browse'],
        ['n', 'create'],
        ['esc', 'back']
      ]}
    >
      <Panel title="yours" width={52}>
        <Box flexDirection="column">
          {projects.map((p, i) => {
            const sel = i === safeCursor
            const envs = p.environments.map((e) => e.name).join(', ') || '—'
            return (
              <Text key={p.id}>
                <Text
                  color={sel ? inkColor(theme.brand) : inkColor(theme.fg)}
                  bold={sel}
                >
                  {sel ? '❯ ' : '  '}
                  {p.name.padEnd(16).slice(0, 16)}
                </Text>
                <Text color={inkColor(theme.muted)} dimColor>
                  {` ${envs.padEnd(14).slice(0, 14)} `}
                  {`${p.secretsCount}s`.padEnd(5)}
                  {formatRelativeTime(p.lastSyncedAt)}
                </Text>
              </Text>
            )
          })}
        </Box>
      </Panel>
    </ScreenChrome>
  )
}
