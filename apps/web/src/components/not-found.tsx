'use client'

import { Button } from '@envy/ui/components/button'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Home01Icon,
  TerminalIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useRouter } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { MeshBackground } from './mesh-background'

export function NotFound() {
  const router = useRouter()

  return (
    <MeshBackground className="overflow-x-hidden min-h-screen flex items-center justify-center">
      <div className="relative z-10 max-w-2xl px-6 text-center w-full">
        {/* Terminal Glitch Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2 mb-6 text-brand"
        >
          <HugeiconsIcon icon={TerminalIcon} size={18} />
          <span className="font-mono text-[11px] md:text-xs font-bold tracking-[0.2em] uppercase">
            System Error: Route Missing
          </span>
        </motion.div>

        {/* 404 Main Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-[64px] md:text-[100px] font-display font-black leading-[1.1] mb-6 relative inline-block text-transparent bg-clip-text"
          style={{
            backgroundImage:
              'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)'
          }}
        >
          404
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 1, duration: 0.8 }}
            className="absolute left-0 bottom-[10%] h-[6px] bg-danger/80 -rotate-2"
          />
        </motion.h1>

        {/* Subtitle Message */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-3xl font-bold font-display text-text-primary mb-4"
        >
          Environment Variable Not Found
        </motion.p>

        {/* Detail text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-text-secondary text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed"
        >
          The namespace you are attempting to access has been isolated,
          encrypted, or never existed in the current layout context.
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/">
            <Button className="bg-brand text-bg font-semibold rounded-lg transition-all hover:brightness-110 active:scale-95 px-8 py-5 text-lg flex items-center justify-center gap-2 group w-full sm:w-auto">
              <HugeiconsIcon
                icon={Home01Icon}
                size={20}
                className="group-hover:-translate-y-0.5 transition-transform"
              />
              Return back
            </Button>
          </Link>
          <Button
            onClick={() => router.history.back()}
            className="bg-transparent border border-ghost-border text-text-primary font-medium rounded-lg transition-all hover:bg-ghost-bg active:scale-95 px-8 py-5 text-lg flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
            cd ..
          </Button>
        </motion.div>

        {/* Console logs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="mt-16 bg-surface-2/50 border border-border backdrop-blur-sm p-4 rounded-lg font-mono text-[11px] md:text-xs text-left text-text-muted overflow-hidden max-w-[400px] mx-auto relative group pointer-events-none"
        >
          <div className="flex gap-2 mb-3 border-b border-border/50 pb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-danger/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/50" />
          </div>
          <div className="flex flex-col gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="text-danger flex gap-2">
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                className="mt-0.5 text-danger"
              />{' '}
              ERR_NO_SUCH_FILE_OR_DIR
            </span>
            <span className="flex gap-2">
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                className="mt-0.5 text-text-muted"
              />{' '}
              Checking route context...
            </span>
            <span className="text-brand flex gap-2">
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                className="mt-0.5 text-brand"
              />{' '}
              Warning: Resource unreachable
            </span>
            <span className="animate-blink flex gap-2">
              <span className="text-brand">&gt;</span> _
            </span>
          </div>
        </motion.div>
      </div>
    </MeshBackground>
  )
}
