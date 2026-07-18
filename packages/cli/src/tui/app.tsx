import { render, useApp, useInput } from 'ink'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { api } from '../core/api'
import { getAuth } from '../core/auth'
import { getConfig } from '../core/config'
import { checkUpdate } from '../core/services/update'
import {
  enterAltScreen,
  installAltScreenGuards,
  leaveAltScreen
} from './bootstrap'
import { FullScreen } from './components/FullScreen'
import { HelpScreen } from './screens/Help'
import { HomeScreen } from './screens/Home'
import { InitScreen } from './screens/Init'
import { LoginScreen } from './screens/Login'
import { LogoutScreen } from './screens/Logout'
import { OpenScreen } from './screens/Open'
import { PaletteScreen } from './screens/Palette'
import { ProjectsScreen } from './screens/Projects'
import { PullScreen } from './screens/Pull'
import { PushScreen } from './screens/Push'
import { UpdateScreen } from './screens/Update'
import { WhoamiScreen } from './screens/Whoami'
import { type ThemeMode, ThemeProvider, useThemeControls } from './theme'
import type { ProjectContext, ScreenId, SessionUser } from './types'

export type TuiOptions = {
  theme?: ThemeMode
}

type SessionOutcome = {
  mutated: boolean
}

function AppInner({ outcome }: { outcome: SessionOutcome }) {
  const { exit } = useApp()
  const { cycleMode } = useThemeControls()
  const [screen, setScreen] = useState<ScreenId | 'palette'>('home')
  const [user, setUser] = useState<SessionUser>(null)
  const [project, setProject] = useState<ProjectContext>(null)
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null)

  const refreshContext = useCallback(async () => {
    const auth = getAuth()
    const config = getConfig()
    setProject(
      config
        ? {
            projectSlug: config.project_slug,
            environment: config.environment
          }
        : null
    )

    if (!auth) {
      setUser(null)
      return
    }

    if (auth.user) setUser({ name: auth.user, email: '' })

    try {
      const me = await api.me.get.query()
      setUser({ name: me.name ?? auth.user ?? 'Unknown', email: me.email })
    } catch {
      if (auth.user) setUser({ name: auth.user, email: '' })
    }
  }, [])

  useEffect(() => {
    void refreshContext()
    checkUpdate({ force: false })
      .then((c) => {
        if (c.updateAvailable) setUpdateAvailable(c.latestVersion)
      })
      .catch(() => {})
  }, [refreshContext])

  const goHome = () => setScreen('home')
  const quit = () => exit()

  // Global: theme cycle + ctrl+c
  useInput((input, key) => {
    if (key.ctrl && input === 't') {
      cycleMode()
      return
    }
    if (key.ctrl && input === 'c') {
      quit()
    }
  })

  const navigate = (id: ScreenId) => setScreen(id)

  const markMutated = () => {
    outcome.mutated = true
  }

  let body: ReactNode = null

  switch (screen) {
    case 'home':
      body = (
        <HomeScreen
          user={user}
          updateAvailable={updateAvailable}
          onNavigate={navigate}
          onQuit={quit}
          onOpenPalette={() => setScreen('palette')}
        />
      )
      break
    case 'palette':
      body = (
        <PaletteScreen onNavigate={navigate} onQuit={quit} onBack={goHome} />
      )
      break
    case 'login':
      body = (
        <LoginScreen
          onDone={(u) => {
            setUser(u)
            void refreshContext()
            goHome()
          }}
          onBack={goHome}
        />
      )
      break
    case 'logout':
      body = (
        <LogoutScreen
          onDone={() => {
            setUser(null)
            goHome()
          }}
          onBack={goHome}
        />
      )
      break
    case 'whoami':
      body = <WhoamiScreen onBack={goHome} />
      break
    case 'open':
      body = <OpenScreen onBack={goHome} />
      break
    case 'projects':
      body = <ProjectsScreen onBack={goHome} />
      break
    case 'init':
      body = (
        <InitScreen
          onBack={goHome}
          onLinked={() => {
            void refreshContext()
            goHome()
          }}
        />
      )
      break
    case 'push':
      body = <PushScreen onBack={goHome} onSuccess={markMutated} />
      break
    case 'pull':
      body = <PullScreen onBack={goHome} onSuccess={markMutated} />
      break
    case 'update':
      body = (
        <UpdateScreen
          onBack={goHome}
          onUpdated={() => setUpdateAvailable(null)}
        />
      )
      break
    case 'help':
      body = <HelpScreen onBack={goHome} />
      break
  }

  // silence unused project for now (available for future chrome)
  void project

  return <FullScreen>{body}</FullScreen>
}

function App({
  initialTheme,
  outcome
}: {
  initialTheme: ThemeMode
  outcome: SessionOutcome
}) {
  return (
    <ThemeProvider initialMode={initialTheme}>
      <AppInner outcome={outcome} />
    </ThemeProvider>
  )
}

export async function startTui(options: TuiOptions = {}): Promise<void> {
  const isTTY = Boolean(process.stdout.isTTY)
  const outcome: SessionOutcome = { mutated: false }

  if (isTTY) {
    enterAltScreen()
    installAltScreenGuards()
  }

  const instance = render(
    <App initialTheme={options.theme ?? 'night'} outcome={outcome} />,
    { exitOnCtrlC: false }
  )

  try {
    await instance.waitUntilExit()
  } finally {
    if (isTTY) leaveAltScreen()
  }

  if (outcome.mutated) {
    console.log('✓ secrets synced')
  }
}
