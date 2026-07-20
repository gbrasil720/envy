'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { requireWebAuth } from '@/functions/require-web-auth'
import { useTRPC } from '@/utils/trpc'

function toSlug(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    await requireWebAuth('onboarding-forbidden')
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
  const [projectName, setProjectName] = useState('')
  const [nameError, setNameError] = useState('')
  const [createdSlug, setCreatedSlug] = useState('')
  const [copied, setCopied] = useState(false)

  const meQueryOpts = trpc.me.get.queryOptions()
  const meQuery = useQuery(meQueryOpts)

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
        setCreatedSlug(data.project.slug)
        setStep(2)
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
  const slug = toSlug(projectName)
  const canCreate = !!slug && !isPending

  const workspaceLabel =
    meQuery.data?.name?.trim() || meQuery.data?.email?.split('@')[0] || 'you'

  function handleCreate() {
    const trimmed = projectName.trim()
    if (!trimmed) {
      setNameError('Project name is required')
      return
    }
    if (trimmed.length > 64) {
      setNameError('Name must be 64 characters or less')
      return
    }
    if (!toSlug(trimmed)) {
      setNameError('Name must contain at least one letter or number')
      return
    }
    setNameError('')
    onboardingCompleteMutation.mutate({ name: trimmed })
  }

  function handleSkip() {
    skipMutation.mutate()
  }

  function goToDashboard() {
    navigate({
      to: '/dashboard',
      search: { project: '', section: 'secrets' as const }
    })
  }

  async function copyCommands() {
    try {
      await navigator.clipboard.writeText(
        'npm i -g useenvy\nenvy login\nenvy push'
      )
    } catch {
      // ignore
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const stepMeta = [
    { label: '01 PROJECT', active: step === 1, done: step > 1 },
    { label: '02 SYNC', active: step === 2, done: false }
  ]

  return (
    <AuthShell
      headerAction={
        step === 1 ? (
          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending}
            className="cursor-pointer font-mono text-[11px] text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
          >
            {skipMutation.isPending ? 'skipping…' : 'skip onboarding →'}
          </button>
        ) : (
          <span className="font-mono text-[11px] text-text-muted">
            {'// onboarding'}
          </span>
        )
      }
    >
      <div className="w-full max-w-[460px]">
        <div className="mb-5 flex items-center gap-2 font-mono text-[10px] tracking-[0.08em]">
          {stepMeta.map((s, i) => (
            <div
              key={s.label}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <span
                className={
                  s.active
                    ? 'text-text-primary'
                    : s.done
                      ? 'text-brand'
                      : 'text-text-muted'
                }
              >
                {s.label}
              </span>
              {i < stepMeta.length - 1 ? (
                <span className="h-px flex-1 bg-ghost-border" />
              ) : null}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="rounded-md border border-ghost-border bg-surface">
            <div className="p-9">
              <h1 className="mb-1.5 text-[22px] font-bold tracking-[-0.015em] text-text-primary">
                Create your first project
                <span className="text-brand">.</span>
              </h1>
              <p className="mb-5 text-[13px] leading-[1.6] text-text-secondary">
                Your personal workspace was created with your account. Every
                project gets three environments out of the box.
              </p>

              <div className="mb-5 rounded border border-ghost-border bg-surface-2 px-[18px] py-4 font-mono text-[12px] leading-[2] text-text-primary">
                <div>
                  <span className="text-text-muted">workspace&nbsp;&nbsp;</span>
                  {workspaceLabel}{' '}
                  <span className="text-text-muted">
                    (personal) · created automatically
                  </span>
                </div>
                <div>
                  <span className="text-text-muted">
                    envs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  </span>
                  development · staging · production
                </div>
              </div>

              <label
                htmlFor="project-name"
                className="mb-1.5 block font-mono text-[10px] tracking-[0.08em] text-text-muted uppercase"
              >
                PROJECT NAME
              </label>
              <input
                id="project-name"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value)
                  if (nameError) setNameError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
                placeholder="my-saas"
                // biome-ignore lint/a11y/noAutofocus: first field of a single-step form
                autoFocus
                disabled={isPending}
                aria-invalid={!!nameError}
                className="w-full rounded border border-input bg-surface-2 px-3 py-3 font-mono text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-focus disabled:opacity-60"
              />
              {slug ? (
                <p className="mt-2 font-mono text-[11px] text-text-muted">
                  slug: <span className="text-text-secondary">{slug}</span>
                </p>
              ) : null}
              {nameError ? (
                <p className="mt-2 text-[12px] text-danger">{nameError}</p>
              ) : null}
              {onboardingCompleteMutation.isError ? (
                <p className="mt-2 text-[12px] text-danger">
                  {onboardingCompleteMutation.error.message}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate}
                className={`mt-5 w-full rounded py-3.5 text-[14px] font-semibold transition-colors ${
                  canCreate
                    ? 'cursor-pointer bg-primary text-primary-foreground hover:bg-white'
                    : 'cursor-not-allowed bg-primary/15 text-text-muted'
                }`}
              >
                {onboardingCompleteMutation.isPending
                  ? 'Creating…'
                  : 'Create project'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-brand/30 bg-surface">
            <div className="p-9">
              <div className="mb-3.5 font-mono text-[12px] text-brand">
                ✓ {createdSlug || slug} created
              </div>
              <h1 className="mb-1.5 text-[22px] font-bold tracking-[-0.015em] text-text-primary">
                Now sync your first secret
                <span className="text-brand">.</span>
              </h1>
              <p className="mb-5 text-[13px] leading-[1.6] text-text-secondary">
                From the repo that owns your .env — three commands and your team
                is synced.
              </p>

              <div className="mb-6 rounded border border-ghost-border bg-surface-2 px-5 py-[18px] font-mono text-[13px] leading-[2.3] text-text-primary">
                <div>
                  <span className="text-text-muted">$ </span>npm i -g useenvy
                </div>
                <div>
                  <span className="text-text-muted">$ </span>envy login
                </div>
                <div>
                  <span className="text-text-muted">$ </span>envy push{' '}
                  <span className="text-text-muted">
                    ← uploads your .env, encrypted
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={copyCommands}
                  className="cursor-pointer rounded border border-ghost-border px-4 py-3 font-mono text-[12px] text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary"
                >
                  {copied ? 'copied ✓' : 'copy commands ⧉'}
                </button>
                <button
                  type="button"
                  onClick={goToDashboard}
                  className="flex-1 cursor-pointer rounded bg-primary py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-white"
                >
                  Go to dashboard →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
