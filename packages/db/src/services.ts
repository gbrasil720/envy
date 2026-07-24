import { and, count, eq } from 'drizzle-orm'
import { db } from './index'
import { hasRole } from './roles'
import { subscription } from './schema/billing'
import { member, organization } from './schema/organization'

export { effectiveRole, hasRole } from './roles'

// ── Ownership: SEMPRE via member.role, nunca via coluna própria ─────────
// O Better Auth já resolve "owner não pode ser removido sem transferir
// antes" nativamente, contanto que as mutações passem pela API dele
// (auth.api.removeMember, auth.api.updateMemberRole, etc) e não por
// db.delete()/db.update() direto na tabela member. Use esta função só
// pra LEITURA (checar permissão em código seu, ex: liberar tela de
// billing), nunca como substituto da validação nativa do plugin.
export async function isOrganizationOwner(
  organizationId: string,
  userId: string
) {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.organizationId, organizationId), eq(member.userId, userId))
    )

  if (!row) return false
  return hasRole(row.role, 'owner')
}

// IMPORTANTE: pra remover member ou transferir ownership, chame
// auth.api.removeMember(...) / auth.api.updateMemberRole(...) do Better
// Auth — não escreva direto na tabela member. O plugin já bloqueia
// remover o último owner (erro nativo dele, não precisa reimplementar).

// ── Read-only quando membros excedem o seatLimit do plano ──────────────

/**
 * Chame isso no início de QUALQUER mutation de escrita (criar/editar
 * projeto, secret, environment, convite) — não só em "adicionar membro".
 * Isso é regra de negócio do Envy, o Better Auth não sabe nada sobre
 * plano/seatLimit — não existe equivalente nativo pra isso.
 *
 * Escape hatches (NÃO chamar aqui): remove member, cancel invite, archive org.
 */
export async function assertOrganizationWritable(organizationId: string) {
  const [sub] = await db
    .select({ seatLimit: subscription.seatLimit, plan: subscription.plan })
    .from(subscription)
    .where(eq(subscription.organizationId, organizationId))

  // Sem subscription registrada = trate como free (seatLimit 1), nunca
  // como ilimitado. Fail-closed, não fail-open.
  const seatLimit = sub?.seatLimit ?? 1

  const [countRow] = await db
    .select({ memberCount: count() })
    .from(member)
    .where(eq(member.organizationId, organizationId))

  const memberCount = countRow?.memberCount ?? 0

  if (memberCount > seatLimit) {
    throw new OrganizationReadOnlyError(memberCount, seatLimit)
  }
}

export class OrganizationReadOnlyError extends Error {
  constructor(
    public memberCount: number,
    public seatLimit: number
  ) {
    super(
      `Organização em modo somente-leitura: ${memberCount} membros excede o limite do plano (${seatLimit}). Remova membros ou faça upgrade.`
    )
    this.name = 'OrganizationReadOnlyError'
  }
}

// ── Soft-delete — nunca DELETE real em organization ────────────────────

/**
 * Única forma permitida de "deletar" uma organização. Nunca chame
 * db.delete(organization)... em lugar nenhum do código — isso dispararia
 * cascade em project/subscription/member e destruiria histórico fiscal.
 * Isso também é Envy-specific — o Better Auth não tem soft-delete nativo
 * de organização, então essa camada precisa ficar por fora do plugin.
 */
export async function archiveOrganization(
  organizationId: string,
  dbClient: Pick<typeof db, 'update'> = db
) {
  await dbClient
    .update(organization)
    .set({ deletedAt: new Date() })
    .where(eq(organization.id, organizationId))
}
