export type ScreenId =
  | 'home'
  | 'login'
  | 'logout'
  | 'whoami'
  | 'projects'
  | 'init'
  | 'push'
  | 'pull'
  | 'open'
  | 'update'
  | 'help'

export type SessionUser = {
  name: string
  email: string
} | null

export type ProjectContext = {
  projectSlug: string
  environment: string
} | null
