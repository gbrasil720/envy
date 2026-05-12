import { Button } from '@envy/ui/components/button'
import { Card, CardContent } from '@envy/ui/components/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@envy/ui/components/field'
import { InputGroup, InputGroupInput } from '@envy/ui/components/input-group'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { MeshBackground } from '@/components/mesh-background'
import { getAuthState } from '@/functions/get-auth-state'
import { useTRPC } from '@/utils/trpc'

const MotionCard = motion.create(Card)

function toSlug(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const auth = await getAuthState()
    if (!auth) throw redirect({ to: '/login' })

    if (auth.onboardingCompletedAt || auth.onboardingSkippedAt) {
      throw redirect({
        to: '/dashboard',
        search: { project: '', section: 'secrets' as const }
      })
    }
  },
  head: () => ({
    meta: [
      { title: 'Get Started — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: OnboardingPage
})

function OnboardingPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [orgName, setOrgName] = useState('')
  const [nameError, setNameError] = useState('')

  const meQueryOpts = trpc.me.get.queryOptions()

  const onboardingCompleteMutation = useMutation(
    trpc.me.completeOnboardingWithProject.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(meQueryOpts.queryKey, (prev) =>
          prev
            ? {
                ...prev,
                onboardingCompletedAt: data.onboardingCompletedAt
              }
            : prev
        )
        queryClient.invalidateQueries(trpc.projects.list.queryOptions())
        navigate({
          to: '/dashboard',
          search: { project: '', section: 'secrets' as const }
        })
      }
    })
  )

  const skipMutation = useMutation(
    trpc.me.skipOnboarding.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(meQueryOpts.queryKey, (prev) =>
          prev
            ? {
                ...prev,
                onboardingSkippedAt: data.onboardingSkippedAt,
                onboardingCompletedAt: data.onboardingCompletedAt
              }
            : prev
        )
        navigate({
          to: '/dashboard',
          search: { project: '', section: 'secrets' as const }
        })
      }
    })
  )

  const isPending =
    onboardingCompleteMutation.isPending || skipMutation.isPending

  function handleContinue() {
    const trimmed = orgName.trim()
    if (!trimmed) {
      setNameError('Workspace name is required')
      return
    }
    if (trimmed.length > 64) {
      setNameError('Name must be 64 characters or less')
      return
    }
    setNameError('')
    setStep(2)
  }

  function handleCreate() {
    onboardingCompleteMutation.mutate({ name: orgName.trim() })
  }

  function handleSkip() {
    skipMutation.mutate()
  }

  const slugPreview = orgName ? toSlug(orgName) : ''

  return (
    <MeshBackground>
      <div className="relative z-10 w-full max-w-[480px] px-6 md:px-0">
        <div className="flex items-center justify-center gap-2 mb-8">
          {([1, 2] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-brand'
                  : s < step
                    ? 'w-4 bg-brand/40'
                    : 'w-4 bg-surface-2'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <MotionCard
              key="step-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-border rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden py-0"
            >
              <CardContent className="p-10 md:p-12">
                <div className="mb-8">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    Step 1 of 2
                  </p>
                  <h1 className="font-display font-semibold text-[26px] md:text-[28px] text-text-primary mb-2 tracking-tight leading-tight">
                    Name your workspace
                  </h1>
                  <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
                    Your workspace is where your projects and secrets live.
                  </p>
                </div>

                <FieldGroup className="py-2">
                  <Field data-invalid={nameError ? true : undefined}>
                    <FieldLabel htmlFor="org-name">Workspace name</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="org-name"
                        value={orgName}
                        onChange={(e) => {
                          setOrgName(e.target.value)
                          if (nameError) setNameError('')
                        }}
                        placeholder="Acme Inc"
                        autoFocus
                        aria-invalid={!!nameError}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleContinue()
                        }}
                      />
                    </InputGroup>
                    {slugPreview ? (
                      <FieldDescription>
                        Slug:{' '}
                        <span className="font-mono text-foreground">
                          {slugPreview}
                        </span>
                      </FieldDescription>
                    ) : (
                      <FieldDescription>
                        A URL-friendly slug will be generated from the name.
                      </FieldDescription>
                    )}
                    {nameError ? <FieldError>{nameError}</FieldError> : null}
                  </Field>
                </FieldGroup>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    className="w-full h-11"
                    onClick={handleContinue}
                    disabled={!orgName.trim()}
                  >
                    Next Step
                  </Button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isPending}
                    className="text-[13px] text-text-muted hover:text-text-secondary transition-colors text-center py-1"
                  >
                    {skipMutation.isPending ? 'Skipping…' : 'Skip onboarding'}
                  </button>
                </div>
              </CardContent>
            </MotionCard>
          )}

          {step === 2 && (
            <MotionCard
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-border rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden py-0"
            >
              <CardContent className="p-10 md:p-12">
                <div className="mb-8">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    Step 2 of 2
                  </p>
                  <h1 className="font-display font-semibold text-[26px] md:text-[28px] text-text-primary mb-2 tracking-tight leading-tight">
                    Create your first project
                  </h1>
                  <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
                    Your workspace and first project will be created together.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface-2 px-5 py-4 mb-6">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    Workspace
                  </p>
                  <p className="font-display font-semibold text-[18px] text-text-primary">
                    {orgName}
                  </p>
                  <p className="font-mono text-[12px] text-text-muted mt-0.5">
                    {slugPreview}
                  </p>
                </div>

                {onboardingCompleteMutation.isError && (
                  <p className="text-[13px] text-danger mb-4">
                    {onboardingCompleteMutation.error.message}
                  </p>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full h-11"
                    onClick={handleCreate}
                    disabled={isPending}
                  >
                    {onboardingCompleteMutation.isPending
                      ? 'Creating…'
                      : 'Create project'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isPending}
                    className="text-[13px] text-text-muted hover:text-text-secondary transition-colors text-center py-1"
                  >
                    ← Edit workspace name
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isPending}
                    className="text-[13px] text-text-muted hover:text-text-secondary transition-colors text-center py-1"
                  >
                    {skipMutation.isPending ? 'Skipping…' : 'Skip onboarding'}
                  </button>
                </div>
              </CardContent>
            </MotionCard>
          )}
        </AnimatePresence>
      </div>
    </MeshBackground>
  )
}
