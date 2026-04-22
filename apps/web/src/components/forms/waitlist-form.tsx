import { Input } from '@envy/ui/components/input'
import {
  ArrowRight01Icon,
  LockIcon,
  Shield01Icon,
  Tick01Icon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion } from 'motion/react'
import { useState } from 'react'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>(
    'idle'
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('submitting')
    setTimeout(() => {
      setStatus('success')
    }, 1500)
  }

  if (status === 'success') {
    return (
      <motion.div
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 text-brand py-4"
      >
        <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center border border-brand/20">
          <HugeiconsIcon icon={Tick01Icon} size={32} />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-brand to-brand-secondary">
            You're on the list!
          </p>
          <p className="text-text-muted text-sm mt-1 uppercase tracking-widest font-bold opacity-70">
            Check your inbox soon
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className="relative group p-2 sm:p-1.5 bg-surface-2/50 backdrop-blur-xl border border-ghost-divider rounded-2xl focus-within:border-brand/40 transition-all shadow-2xl flex flex-col sm:flex-row sm:items-stretch gap-4 sm:gap-2">
        <div className="absolute inset-0 bg-brand/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <Input
          type="email"
          required
          name="email"
          autoComplete="email"
          placeholder="Enter your email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full sm:flex-1 h-auto min-h-11 border-0 rounded-none bg-transparent dark:bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-lg shadow-none outline-none placeholder:text-text-muted relative z-10 focus-visible:ring-0 focus-visible:border-0 disabled:bg-transparent dark:disabled:bg-transparent"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full sm:w-auto sm:self-stretch shrink-0 bg-brand text-bg px-8 py-3.5 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70 relative z-10 shadow-lg shadow-brand/20"
        >
          {status === 'submitting' ? (
            <div className="w-6 h-6 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
          ) : (
            <>
              Join <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
            </>
          )}
        </button>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-text-muted text-[11px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] opacity-50">
        <span className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Shield01Icon} size={10} /> Secure
        </span>
        <span className="w-1 h-1 bg-ghost-border rounded-full shrink-0" />
        <span className="flex items-center gap-1.5">
          <HugeiconsIcon icon={LockIcon} size={10} /> 256-bit AES
        </span>
        <span className="w-1 h-1 bg-ghost-border rounded-full shrink-0" />
        <span>Early Access</span>
      </div>
    </form>
  )
}
