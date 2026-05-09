import { Shield01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { scrollToSection } from '@/lib/smooth-scroll'

const GITHUB_URL = 'https://github.com/gbrasil720/envy'

export function Footer() {
  return (
    <footer className="py-20 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6 w-fit">
              <div className="size-8 bg-[#111] rounded-lg flex items-center justify-center">
                <img
                  src="/logo-no-bg.png"
                  alt="Envy"
                  className="size-14 object-cover"
                />
              </div>
              <span className="text-xl font-display font-bold tracking-tight">
                envy
              </span>
            </Link>
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
            <h4 className="font-semibold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-text-secondary">
              <li>
                <a
                  href="/#features"
                  onClick={(e) => {
                    if (window.location.pathname === '/') {
                      e.preventDefault()
                      scrollToSection('features')
                    }
                  }}
                  className="hover:text-brand transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="/#pricing"
                  onClick={(e) => {
                    if (window.location.pathname === '/') {
                      e.preventDefault()
                      scrollToSection('pricing')
                    }
                  }}
                  className="hover:text-brand transition-colors"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-text-secondary">
              <li>
                <a
                  href={`${GITHUB_URL}#readme`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/brasilgui0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand transition-colors"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5 text-xs text-text-muted">
          <p>© 2026 Envy. Built with ☕ and paranoia about secret leaks.</p>
          <div className="flex items-center gap-8">
            <a
              href={`${GITHUB_URL}/blob/main/PRIVACY.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href={`${GITHUB_URL}/blob/main/TERMS.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
