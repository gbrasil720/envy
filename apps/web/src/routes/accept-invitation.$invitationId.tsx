import { Button } from '@envy/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@envy/ui/components/card'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'
import { useTRPC } from '@/utils/trpc'

export const Route = createFileRoute('/accept-invitation/$invitationId')({
  head: () => ({
    meta: [
      { title: 'Organization Invitation — Envy' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: AcceptInvitationPage
})

type InvitationDetails = {
  organizationName: string
  inviterEmail: string
  role: string
  expiresAt: Date
}

function AcceptInvitationPage() {
  const { invitationId } = Route.useParams()
  const trpc = useTRPC()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const userId = session?.user.id
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const acceptMutation = useMutation(
    trpc.members.accept.mutationOptions({
      onSuccess: () => {
        window.location.assign('/auth/callback')
      },
      onError: (cause) => {
        setError(cause.message)
      }
    })
  )

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    setIsLoading(true)
    setError(null)
    void authClient.organization
      .getInvitation({ query: { id: invitationId } })
      .then((result) => {
        if (cancelled) return
        if (result.error) {
          setError(result.error.message ?? 'Invitation unavailable')
          return
        }
        if (result.data) {
          setInvitation({
            organizationName: result.data.organizationName,
            inviterEmail: result.data.inviterEmail,
            role: result.data.role,
            expiresAt: new Date(result.data.expiresAt)
          })
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : 'Invitation unavailable'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [invitationId, userId])

  function signIn() {
    const callbackURL = `${window.location.origin}/accept-invitation/${encodeURIComponent(invitationId)}`
    void authClient.signIn.social({
      provider: 'github',
      callbackURL,
      errorCallbackURL: `${window.location.origin}/login?error=oauth_failed`
    })
  }

  function acceptInvitation() {
    setError(null)
    acceptMutation.mutate({ invitationId })
  }

  const isSignedOut = !sessionPending && !session?.user

  return (
    <AuthShell headerHint="// invitation">
      <Card className="w-full max-w-[440px]">
        <CardHeader>
          <CardTitle>
            {isSignedOut ? 'Sign in to review' : 'Organization invitation'}
          </CardTitle>
          <CardDescription>
            {isSignedOut
              ? 'Use the GitHub account whose email received this invitation.'
              : invitation
                ? `${invitation.inviterEmail} invited you to join ${invitation.organizationName}.`
                : 'Loading the invitation details…'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {invitation ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 font-mono text-[11px]">
              <dt className="text-text-muted">organization</dt>
              <dd className="text-text-primary">
                {invitation.organizationName}
              </dd>
              <dt className="text-text-muted">role</dt>
              <dd className="text-text-primary">{invitation.role}</dd>
              <dt className="text-text-muted">expires</dt>
              <dd className="text-text-primary">
                {invitation.expiresAt.toLocaleString()}
              </dd>
            </dl>
          ) : null}
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter>
          {isSignedOut ? (
            <Button size="lg" className="w-full" onClick={signIn}>
              Continue with GitHub
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={isLoading || acceptMutation.isPending || !invitation}
              onClick={acceptInvitation}
            >
              {acceptMutation.isPending ? 'Joining…' : 'Accept invitation'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </AuthShell>
  )
}
