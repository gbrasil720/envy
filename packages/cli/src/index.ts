#!/usr/bin/env node

import { Command } from 'commander'
import updateNotifier from 'update-notifier'
import pkg from '../package.json'
import { registerInit } from './commands/init'
import { registerLogin } from './commands/login'
import { registerLogout } from './commands/logout'
import { registerOpen } from './commands/open'
import { registerProjects } from './commands/projects'
import { registerPull } from './commands/pull'
import { registerPush } from './commands/push'
import { registerWhoAmI } from './commands/whoami'
import { describeError, EnvyError } from './lib/errors'
import { output } from './lib/output'

updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 * 24 }).notify()

const program = new Command()

program
  .name('envy')
  .description('Envy CLI — manage your secrets')
  .version(pkg.version)

registerLogin(program)
registerWhoAmI(program)
registerLogout(program)
registerInit(program)
registerProjects(program)
registerPush(program)
registerPull(program)
registerOpen(program)

try {
  await program.parseAsync()
} catch (err) {
  output.stopSpinner()

  if (err instanceof EnvyError) {
    output.error(err.message, err.suggestion)
    if (process.env.ENVY_DEBUG && err.stack) {
      console.error(err.stack)
    }
    process.exit(err.exitCode)
  }

  const { message, suggestion } = describeError(err)
  output.error(message, suggestion)
  if (process.env.ENVY_DEBUG && err instanceof Error) {
    console.error(err.stack ?? '')
    const cause = (err as { cause?: unknown }).cause
    if (cause) console.error('cause:', cause)
  }
  process.exit(1)
}
