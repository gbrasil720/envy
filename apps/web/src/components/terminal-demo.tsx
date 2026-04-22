/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
'use client'

import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

const SCRIPT = [
  { type: 'cmd', text: '$ npx envy pull --env production' },
  { type: 'out', text: '  ✓ Connected to useenvy.dev', color: 'text-brand' },
  {
    type: 'out',
    text: '  ✓ Fetching secrets for "my-saas" [production]',
    color: 'text-brand'
  },
  {
    type: 'out',
    text: '  ✓ 12 secrets synced in 243ms',
    color: 'text-brand'
  },
  { type: 'out', text: '' },
  {
    type: 'out',
    text: '  DATABASE_URL      ████████████  updated',
    color: 'text-text-primary'
  },
  {
    type: 'out',
    text: '  STRIPE_SECRET     ████████████  new',
    color: 'text-text-primary'
  },
  {
    type: 'out',
    text: '  OPENAI_API_KEY    ████████████  unchanged',
    color: 'text-text-primary'
  },
  { type: 'out', text: '' },
  { type: 'cmd', text: '$ npx envy run -- node server.js' },
  {
    type: 'out',
    text: '  ▶ Injecting 12 secrets into process...',
    color: 'text-text-primary'
  },
  { type: 'out', text: '  ▶ Starting server on :3000', color: 'text-brand' }
] as const

export function TerminalDemo() {
  const reduceMotion = useReducedMotion()
  const [lines, setLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState('')
  const [step, setStep] = useState(0)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduceMotion) {
      setLines(SCRIPT.map((s) => s.text))
      setStep(SCRIPT.length)
      setCurrentLine('')
    }
  }, [reduceMotion])

  useEffect(() => {
    if (reduceMotion) return

    if (step >= SCRIPT.length) {
      setTimeout(() => {
        setLines([])
        setStep(0)
      }, 3000)
      return
    }

    const current = SCRIPT[step]
    if (current?.type === 'cmd') {
      let i = 0
      const interval = setInterval(() => {
        setCurrentLine(current.text.slice(0, i + 1))
        i++
        if (i >= current.text.length) {
          clearInterval(interval)
          setTimeout(() => {
            setLines((prev) => [...prev, current.text])
            setCurrentLine('')
            setStep((s) => s + 1)
          }, 500)
        }
      }, 50)
      return () => clearInterval(interval)
    }
    const timeoutId = setTimeout(() => {
      setLines((prev) => [...prev, current?.text ?? ''])
      setStep((s) => s + 1)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [step, reduceMotion])

  return (
    <div
      role="img"
      aria-label="Terminal demo showing envy pull and envy run commands"
      className="dark bg-[#0D0D14] border border-white/10 rounded-xl overflow-hidden shadow-2xl w-full min-w-0 max-w-3xl mx-auto mt-8 md:mt-16 font-mono text-xs sm:text-sm md:text-base"
    >
      <div className="bg-white/5 px-4 py-2 flex items-center gap-2 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        <div className="ml-2 text-xs text-text-muted">bash — 80x24</div>
      </div>
      <div
        className="p-4 md:p-6 h-[220px] sm:h-[280px] md:h-[320px] overflow-x-auto overflow-y-auto whitespace-pre"
        ref={terminalRef}
      >
        {lines.map((line, i) => {
          const scriptLine = SCRIPT.find((s) => s.text === line)
          const colorClass =
            scriptLine && 'color' in scriptLine
              ? scriptLine.color
              : 'text-text-primary'
          return (
            <div key={i} className={`mb-1 ${colorClass}`}>
              {line}
            </div>
          )
        })}
        {currentLine && (
          <div className="text-text-primary">
            {currentLine}
            <span className="animate-pulse">_</span>
          </div>
        )}
        {!currentLine &&
          step < SCRIPT.length &&
          SCRIPT[step]?.type === 'cmd' && (
            <div className="text-text-primary">
              $ <span className="animate-pulse">_</span>
            </div>
          )}
      </div>
    </div>
  )
}
