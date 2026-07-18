import { Command } from 'commander'
import pkg from '../../package.json'
import { registerInit } from '../commands/init'
import { registerLogin } from '../commands/login'
import { registerLogout } from '../commands/logout'
import { registerOpen } from '../commands/open'
import { registerProjects } from '../commands/projects'
import { registerPull } from '../commands/pull'
import { registerPush } from '../commands/push'
import { registerUpdate } from '../commands/update'
import { registerWhoAmI } from '../commands/whoami'

export function createProgram(): Command {
	const program = new Command()

	program
		.name('envy')
		.description('Envy CLI — manage your secrets')
		.version(pkg.version)
		.option('--no-tui', 'Force headless mode even when a TTY is available')
		.option('--theme <mode>', 'TUI theme: night | day | auto', 'night')

	registerLogin(program)
	registerWhoAmI(program)
	registerLogout(program)
	registerInit(program)
	registerProjects(program)
	registerPush(program)
	registerPull(program)
	registerOpen(program)
	registerUpdate(program)

	program
		.command('tui')
		.description('Open the interactive Envy TUI')
		.option('--theme <mode>', 'Theme: night | day | auto')
		.action(async (opts: { theme?: string }) => {
			const { startTui } = await import('../tui/app')
			const { isThemeMode } = await import('../tui/theme')
			const theme = isThemeMode(opts.theme) ? opts.theme : undefined
			await startTui({ theme })
		})

	return program
}
