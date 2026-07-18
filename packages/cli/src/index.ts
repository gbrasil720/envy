#!/usr/bin/env node

import pkg from '../package.json'
import { createProgram } from './cli/program'
import { checkForUpdate } from './core/checkForUpdate'
import { describeError, EnvyError } from './core/errors'
import { output } from './core/output'
import { isThemeMode, type ThemeMode } from './tui/theme'

function parseThemeFlag(argv: string[]): ThemeMode | undefined {
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--theme' && argv[i + 1]) {
			const v = argv[i + 1]
			if (isThemeMode(v)) return v
		}
		if (a?.startsWith('--theme=')) {
			const v = a.slice('--theme='.length)
			if (isThemeMode(v)) return v
		}
	}
	const env = process.env.ENVY_THEME
	if (isThemeMode(env)) return env
	return undefined
}

function shouldLaunchTui(argv: string[]): boolean {
	if (process.env.CI) return false
	if (process.env.ENVY_NO_TUI) return false
	if (!process.stdout.isTTY || !process.stdin.isTTY) return false

	const args = argv.slice(2).filter((a) => a !== '--')

	if (args.includes('--no-tui')) return false
	if (args.includes('--help') || args.includes('-h')) return false
	if (args.includes('--version') || args.includes('-V')) return false

	// Allow `envy` or `envy --theme night` (only theme flags) → TUI
	const nonTheme = args.filter(
		(a, i, arr) =>
			a !== '--theme' &&
			!a.startsWith('--theme=') &&
			!(arr[i - 1] === '--theme')
	)
	if (nonTheme.length === 0) return true

	return false
}

async function main(): Promise<void> {
	if (shouldLaunchTui(process.argv)) {
		const { startTui } = await import('./tui/app')
		await startTui({ theme: parseThemeFlag(process.argv) })
		return
	}

	const program = createProgram()
	await checkForUpdate(pkg.version)

	try {
		await program.parseAsync(process.argv)
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
}

await main()
