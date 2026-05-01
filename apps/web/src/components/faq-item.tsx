import { Button } from '@envy/ui/components/button'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'

export function FAQItem({
  question,
  answer
}: {
  question: string
  answer: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="border-b border-ghost-divider">
      <Button
        type="button"
        variant="link"
        className="decoration-0 h-auto min-w-0 w-full shrink whitespace-normal py-6 flex items-start justify-between gap-4 text-left hover:text-brand transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="min-w-0 flex-1 text-lg font-medium text-left wrap-break-word pr-2">
          {question}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={`mt-1 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="min-w-0 text-sm pb-6 text-text-secondary leading-relaxed wrap-break-word">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
