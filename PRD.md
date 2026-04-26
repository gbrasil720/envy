# PRD — Envy Onboarding Flow

## Contexto

Após deploy bem-sucedido (Railway + Vercel), o próximo milestone é o onboarding de novos usuários. O objetivo é guiar o usuário desde o primeiro login até ter um projeto criado e estar pronto para usar o Envy.

---

## Decisões de design

- **Estado de onboarding persiste no banco**, não no localStorage — campo `onboardingCompletedAt` na tabela de usuário
- **"Conta nova" ≠ "sem projetos"** — o critério é `onboardingCompletedAt IS NULL`, não ausência de projetos
- **CLI fora do onboarding por ora** — CLI ainda não está publicada no npm; o passo de CLI será adicionado quando estiver disponível
- **Onboarding obrigatório na primeira vez**, mas pode ser pulado (campo `onboardingSkippedAt`)

---

## Alterações de banco de dados

### Tabela `user` (Better Auth)

Adicionar dois campos via migration Drizzle:

```typescript
onboardingCompletedAt: timestamp('onboarding_completed_at'),
onboardingSkippedAt: timestamp('onboarding_skipped_at'),
```

> Atenção: a tabela `user` é gerenciada pelo Better Auth. Verificar se o Drizzle adapter permite campos customizados ou se é necessário uma tabela `user_profile` separada com FK para `user.id`.

---

## Alterações de backend (tRPC)

### Novo router: `user`

**`user.me`** — query
- Retorna o usuário autenticado atual
- Inclui: `id`, `name`, `email`, `image`, `onboardingCompletedAt`, `onboardingSkippedAt`
- Requer sessão ativa (middleware de auth)

**`user.completeOnboarding`** — mutation
- Seta `onboardingCompletedAt = now()` para o usuário autenticado
- Retorna o usuário atualizado

**`user.skipOnboarding`** — mutation
- Seta `onboardingSkippedAt = now()` para o usuário autenticado
- Retorna o usuário atualizado

---

## Lógica de redirect (frontend)

Após login bem-sucedido:

```
authClient.signIn.social({ provider: 'github', callbackURL: '/auth/callback' })
```

Na rota `/auth/callback`:
1. Chama `user.me`
2. Se `onboardingCompletedAt === null` E `onboardingSkippedAt === null` → redirect para `/onboarding`
3. Caso contrário → redirect para `/dashboard`

Também aplicar essa verificação como guard na rota `/dashboard`:
- Se usuário não tem onboarding completo nem pulado → redirect para `/onboarding`

---

## Telas

### `/onboarding`

Flow de 2 steps:

**Step 1 — Criar organização**
- Campo: nome da organização
- Slug gerado automaticamente a partir do nome (editável)
- CTA: "Continuar"
- Chama mutation existente de criação de organização

**Step 2 — Criar primeiro projeto**
- Campo: nome do projeto
- Campo: descrição (opcional)
- Campo: environment padrão (ex: `production`, `development`) — pode ser fixo por ora
- CTA: "Criar projeto"
- Chama mutation existente de criação de projeto
- Após sucesso: chama `user.completeOnboarding` → redirect para `/dashboard`

**Link "Pular onboarding"** disponível em ambos os steps
- Chama `user.skipOnboarding` → redirect para `/dashboard`

### Indicador de progresso
- Barra ou steps visuais no topo: Step 1 / Step 2
- Estilo consistente com o design system existente (green `#3DD68C`, dark background)

---

## Rotas a criar

| Rota | Descrição |
|---|---|
| `/onboarding` | Tela de onboarding com steps |
| `/auth/callback` | Rota de callback pós-login com lógica de redirect |

---

## Ordem de implementação sugerida

1. Migration: adicionar campos `onboardingCompletedAt` e `onboardingSkippedAt` na tabela de usuário
2. Router tRPC `user` com queries/mutations (`me`, `completeOnboarding`, `skipOnboarding`)
3. Rota `/auth/callback` com lógica de redirect
4. Guard na rota `/dashboard`
5. Tela `/onboarding` com Step 1 (organização) e Step 2 (projeto)
6. Testar fluxo completo: login → onboarding → dashboard

---

## Fora do escopo (por ora)

- Passo de instalação da CLI no onboarding
- Onboarding para usuários convidados (fluxo diferente via `members.accept`)
- Email de boas-vindas
- Animações elaboradas entre steps