const STORAGE_KEY = 'envy:recent_projects'
const MAX_RECENT = 3

export function useRecentProjects() {
  function getRecent(): string[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      return []
    }
  }

  function trackOpen(projectId: string) {
    const recent = getRecent().filter((id) => id !== projectId)
    const updated = [projectId, ...recent].slice(0, MAX_RECENT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return { getRecent, trackOpen }
}
