import { execSync } from 'node:child_process'

const prev = process.env.VERCEL_GIT_PREVIOUS_SHA
const curr = process.env.VERCEL_GIT_COMMIT_SHA

if (!prev || !curr) {
  console.log('No SHAs available, deploying')
  process.exit(1)
}

const paths = [
  'apps/web/',
  'packages/api/',
  'packages/auth/',
  'packages/env/',
  'packages/config/',
  'packages/ui/'
]

try {
  const changed = execSync(`git diff --name-only ${prev} ${curr}`, {
    encoding: 'utf-8'
  })
  console.log('Changed files:', changed)

  const shouldDeploy = paths.some((path) => changed.includes(path))
  console.log('Should deploy:', shouldDeploy)

  process.exit(shouldDeploy ? 1 : 0)
} catch (err) {
  console.log('git diff failed, deploying to be safe')
  process.exit(1)
}
