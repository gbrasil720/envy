/** Compare semver-ish strings. Returns negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: string, b: string): number {
  const pa = a
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
  const pb = b
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) return da - db
  }
  return 0
}

export function isNewerVersion(latest: string, current: string): boolean {
  return compareSemver(latest, current) > 0
}
