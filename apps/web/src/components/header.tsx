import { Link } from '@tanstack/react-router'

import UserMenu from './user-menu'

export default function Header() {
  const links = [
    { to: '/', label: 'Home' },
    { to: '/dashboard', label: 'Dashboard' }
  ] as const

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2 sm:px-6">
        <nav className="flex flex-wrap gap-3 sm:gap-4 text-sm sm:text-base">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to}>
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  )
}
