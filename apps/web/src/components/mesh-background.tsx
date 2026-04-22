export function MeshBackground({
  children,
  className,
  intensity = 'default'
}: {
  children?: React.ReactNode
  className?: string
  intensity?: 'default' | 'strong'
}) {
  return (
    <div
      className={`relative min-h-dvh w-full max-w-full min-w-0 bg-bg overflow-hidden overflow-x-clip ${className ?? 'flex items-center justify-center'}`}
    >
      <div
        className="mesh-noise fixed inset-0 pointer-events-none"
        aria-hidden="true"
      />

      <div
        className="mesh-orb mesh-orb-1"
        aria-hidden="true"
        style={
          intensity === 'strong'
            ? {
                background:
                  'radial-gradient(circle, rgba(61, 214, 140, 0.28) 0%, transparent 68%)'
              }
            : undefined
        }
      />
      <div className="mesh-orb mesh-orb-2" aria-hidden="true" />
      <div className="mesh-orb mesh-orb-3" aria-hidden="true" />

      <div
        className="mesh-dot-grid fixed inset-0 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="mesh-beam fixed top-0 left-0 right-0 pointer-events-none"
        aria-hidden="true"
      />

      {children}
    </div>
  )
}
