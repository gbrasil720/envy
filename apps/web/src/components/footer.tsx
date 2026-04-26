import { Shield01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="py-20 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-[#111] rounded-lg flex items-center justify-center">
                <img
                  src="/logo-no-bg.png"
                  alt="Envy"
                  className="w-14 h-14 object-cover"
                />
              </div>
              <span className="text-xl font-display font-bold tracking-tight">
                envy
              </span>
            </div>
            <p className="text-text-secondary max-w-xs leading-relaxed">
              Your secrets. In sync. Always. The modern way to manage
              environment variables for teams.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-text-muted flex items-center gap-2">
                <HugeiconsIcon icon={Shield01Icon} size={12} />
                AES-256 Encrypted
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-text-secondary">
              <li>
                <Link to="/" className="hover:text-brand transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-brand transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-brand transition-colors">
                  Changelog
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-brand transition-colors">
                  Roadmap
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-text-secondary">
              <li>
                <Link to="/" className="hover:text-brand transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-brand transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-brand transition-colors">
                  Twitter
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-brand transition-colors">
                  GitHub
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5 text-xs text-text-muted">
          <p>© 2026 Envy. Built with ☕ and paranoia about secret leaks.</p>
          <div className="flex items-center gap-8">
            <Link to="/" className="hover:text-text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/" className="hover:text-text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
