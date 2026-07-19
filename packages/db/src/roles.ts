// Better Auth stores roles as comma-separated strings (e.g. "admin,owner").

/** True if the raw role string includes `target` (CSV-aware). */
export function hasRole(role: string, target: string): boolean {
  return role
    .split(',')
    .map((r) => r.trim())
    .includes(target)
}

/** Effective single role for API/UI: owner > admin > member. */
export function effectiveRole(role: string): 'owner' | 'admin' | 'member' {
  if (hasRole(role, 'owner')) return 'owner'
  if (hasRole(role, 'admin')) return 'admin'
  return 'member'
}
