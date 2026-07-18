import { Box, Text } from 'ink'
import type { ReactNode } from 'react'
import pkg from '../../../package.json'
import { colors } from '../theme'
import type { ProjectContext, SessionUser } from '../types'

type FrameProps = {
  user: SessionUser
  project: ProjectContext
  updateAvailable?: string | null
  children: ReactNode
  footer?: string
}

export function Frame({
  user,
  project,
  updateAvailable,
  children,
  footer
}: FrameProps) {
  const userLabel = user ? user.name : 'not logged in'
  const projectLabel = project
    ? `${project.projectSlug} · ${project.environment}`
    : 'no project linked'
  const updateLabel = updateAvailable ? ` ↑ v${updateAvailable}` : ''

  return (
    <Box flexDirection="column" width="100%" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor={colors.brand}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text>
          <Text color={colors.brand} bold>
            envy
          </Text>
          <Text dimColor> v{pkg.version}</Text>
          {updateLabel ? <Text color={colors.warn}>{updateLabel}</Text> : null}
        </Text>
        <Text dimColor>
          {userLabel} · {projectLabel}
        </Text>
      </Box>

      <Box flexDirection="column" marginY={1} minHeight={12}>
        {children}
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {footer ?? '↑↓ navigate  ⏎ select  esc back  q quit  ? help'}
        </Text>
      </Box>
    </Box>
  )
}
