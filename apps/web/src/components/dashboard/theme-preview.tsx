export function ThemePreview({ mode }: { mode: 'light' | 'dark' | 'system' }) {
  if (mode === 'system') {
    return (
      <div className="h-9 w-full overflow-hidden rounded-lg border border-border">
        <div className="flex h-full">
          <div className="flex-1 bg-white">
            <div className="h-2 bg-gray-100" />
            <div className="p-1">
              <div className="mb-0.5 h-1 w-full rounded-sm bg-gray-200" />
              <div className="h-1 w-2/3 rounded-sm bg-gray-100" />
            </div>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 bg-zinc-900">
            <div className="h-2 bg-zinc-800" />
            <div className="p-1">
              <div className="mb-0.5 h-1 w-full rounded-sm bg-zinc-700" />
              <div className="h-1 w-2/3 rounded-sm bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'dark') {
    return (
      <div className="h-9 w-full overflow-hidden rounded-lg border border-zinc-700/60 bg-zinc-900">
        <div className="h-2 bg-zinc-800" />
        <div className="p-1.5">
          <div className="mb-0.5 h-1 w-full rounded-sm bg-zinc-700" />
          <div className="h-1 w-2/3 rounded-sm bg-zinc-800" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-9 w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="h-2 bg-gray-100" />
      <div className="p-1.5">
        <div className="mb-0.5 h-1 w-full rounded-sm bg-gray-200" />
        <div className="h-1 w-2/3 rounded-sm bg-gray-100" />
      </div>
    </div>
  )
}
