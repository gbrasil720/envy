import { Box, Text } from 'ink'
import { inkColor, useTheme } from '../theme'
import type { ProjectContext, SessionUser } from '../types'

export function StatusPills({
  user,
  project,
  updateAvailable
}: {
  user: SessionUser
  project: ProjectContext
  updateAvailable?: string | null
}) {
  const theme = useTheme()

  const pills: { label: string; value: string }[] = []
  if (project) {
    pills.push({
      label: 'project',
      value: `${project.projectSlug} · ${project.environment}`
    })
  }
  if (user) {
    pills.push({
      label: 'you',
      value: user.email ? `${user.name}` : user.name
    })
  }
  if (updateAvailable) {
    pills.push({ label: 'update', value: `v${updateAvailable}` })
  }

  if (pills.length === 0) return null

  return (
    <Box flexDirection="row" flexShrink={0}>
      {pills.map((p, i) => (
        <Box key={p.label} marginLeft={i > 0 ? 2 : 0}>
          <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
            {'┌─ '}
          </Text>
          <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
            {p.label}
          </Text>
          <Text color={inkColor(theme.border)} dimColor={theme.dimSecondary}>
            {' ─'}
          </Text>
        </Box>
      ))}
    </Box>
  )
}

export function StatusPillsValues({
  user,
  project,
  updateAvailable
}: {
  user: SessionUser
  project: ProjectContext
  updateAvailable?: string | null
}) {
  const theme = useTheme()
  const parts: string[] = []
  if (project) parts.push(`${project.projectSlug} · ${project.environment}`)
  if (user) parts.push(user.name)
  if (updateAvailable) parts.push(`↑ v${updateAvailable}`)
  if (parts.length === 0) {
    return (
      <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
        not linked · not signed in
      </Text>
    )
  }
  return (
    <Text color={inkColor(theme.fg)}>
      {parts.map((part, i) => (
        <Text key={part}>
          {i > 0 ? (
            <Text color={inkColor(theme.muted)} dimColor={theme.dimSecondary}>
              {'  ·  '}
            </Text>
          ) : null}
          <Text color={i === 0 ? inkColor(theme.brand) : inkColor(theme.fg)}>
            {part}
          </Text>
        </Text>
      ))}
    </Text>
  )
}
