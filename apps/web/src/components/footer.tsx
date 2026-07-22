import { Link } from '@tanstack/react-router'
import { EnvyWordmark } from '@/components/brand'

const GITHUB_URL = 'https://github.com/gbrasil720/envy'

const LINKS = [
  { label: 'Docs', href: `${GITHUB_URL}#readme` },
  { label: 'GitHub', href: GITHUB_URL },
  { label: 'Changelog', href: `${GITHUB_URL}/releases` },
  { label: 'Security', href: `${GITHUB_URL}/blob/main/SECURITY.md` },
  { label: 'Privacy', href: `${GITHUB_URL}/blob/main/PRIVACY.md` }
] as const

export function Footer() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 border-x border-border px-6 pb-10 pt-6 sm:flex-row sm:items-center sm:px-10">
      <Link to="/">
        <EnvyWordmark markSize={17} className="text-[13px]" />
      </Link>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-text-muted">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-brand"
          >
            {link.label}
          </a>
        ))}
      </div>
      <span className="font-mono text-[11px] text-text-muted">
        © 2026 envy — useenvy.dev
      </span>
    </footer>
  )
}
