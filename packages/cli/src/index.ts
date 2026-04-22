import { Command } from 'commander'
import { registerInit } from './commands/init'
import { registerLogin } from './commands/login'
import { registerLogout } from './commands/logout'
import { registerPull } from './commands/pull'
import { registerPush } from './commands/push'
import { registerWhoAmI } from './commands/whoami'
import { EnvyError } from './lib/errors'
import { output } from './lib/output'

const program = new Command()

program
  .name('envy')
  .description('Envy CLI — manage your secrets')
  .version('0.0.1')

registerLogin(program)
registerWhoAmI(program)
registerLogout(program)
registerInit(program)
registerPush(program)
registerPull(program)

try {
  await program.parseAsync()
} catch (err) {
  output.stopSpinner()
  if (err instanceof EnvyError) {
    output.error(err.message, err.suggestion)
    process.exit(err.exitCode)
  }
  output.error(
    err instanceof Error ? err.message : 'An unexpected error occurred'
  )
  process.exit(1)
}
