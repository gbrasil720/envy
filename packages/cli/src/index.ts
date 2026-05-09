#!/usr/bin/env node

import { Command } from 'commander'
import { registerInit } from './commands/init'
import { registerLogin } from './commands/login'
import { registerLogout } from './commands/logout'
import { registerOpen } from './commands/open'
import { registerProjects } from './commands/projects'
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
registerProjects(program)
registerPush(program)
registerPull(program)
registerOpen(program)

function describeFetchError(err: unknown): {
  message: string
  suggestion?: string
} {
  if (!(err instanceof Error)) {
    return { message: 'An unexpected error occurred' }
  }

  if (err.message !== 'fetch failed') {
    return { message: err.message }
  }

  const cause = (err as { cause?: unknown }).cause
  const causeCode =
    cause && typeof cause === 'object' && 'code' in cause
      ? String((cause as { code: unknown }).code)
      : undefined
  const causeMessage =
    cause instanceof Error
      ? cause.message
      : cause && typeof cause === 'object' && 'message' in cause
        ? String((cause as { message: unknown }).message)
        : undefined

  const detail = causeMessage ? `fetch failed — ${causeMessage}` : 'fetch failed'

  switch (causeCode) {
    case 'ENOTFOUND':
      return {
        message: detail,
        suggestion: 'DNS lookup failed. Check the API URL and your connection.'
      }
    case 'ECONNREFUSED':
      return {
        message: detail,
        suggestion:
          'Connection refused. Is the server running and reachable at the configured API URL?'
      }
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
      return {
        message: detail,
        suggestion: 'Connection timed out. Check your network or VPN/proxy.'
      }
    case 'CERT_HAS_EXPIRED':
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
      return {
        message: detail,
        suggestion: 'TLS certificate problem. Verify the API URL uses HTTPS and the cert is valid.'
      }
    default:
      return {
        message: detail,
        suggestion:
          'Network request failed. Run with ENVY_DEBUG=1 for a full stack trace.'
      }
  }
}

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

  const { message, suggestion } = describeFetchError(err)
  output.error(message, suggestion)
  if (process.env.ENVY_DEBUG && err instanceof Error) {
    console.error(err.stack ?? '')
    const cause = (err as { cause?: unknown }).cause
    if (cause) console.error('cause:', cause)
  }
  process.exit(1)
}
