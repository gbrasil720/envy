import { z } from 'zod'

export const envNameSchema = z
  .string()
  .min(2, 'Environment name must be at least 2 characters')
  .max(24, 'Environment name must be 24 characters or fewer')
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    'Only lowercase letters, numbers, and hyphens (no leading/trailing hyphens)'
  )
