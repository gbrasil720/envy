# Envy UI redesign — roadmap

Branch: `refactor/ui`  
Design sources (historical): `Envy *.dc.html` + `assets/` (applied into the product).

## Done

| Phase | Commit | Scope |
|---|---|---|
| 0 | `d2aa980` | Design tokens, fonts (Instrument Sans + IBM Plex Mono), brand assets, `EnvyMark` / `EnvyWordmark` |
| 1 | `24c2be6` | Landing page rewrite (hero manifest, proof, how, features, pricing, FAQ, CTA) |
| 2 | `12a26d5` | Auth shell, login, CLI authorize / done / expired |
| 3 | `dc3475b` | Onboarding project-first + CLI sync step |
| 4 | `22ad9d6` | Dashboard shell, home project picker, secrets table, new-project dialog |
| 5 | `23eaaee` | Members, audit log, project settings / environments, invite dialog |
| 6 | `41ad226` | Command palette + account preferences sheet |
| 7 | `b327391` | Remove unused mesh/marketing components, restyle 404 |

## Remaining / follow-ups

### Auth & access
- [ ] **GitHub OAuth reliability** — callback URL on the GitHub OAuth App must be exactly  
  `{BETTER_AUTH_URL}/api/auth/callback/github` (local: `http://localhost:3000/api/auth/callback/github`).  
  Use `GITHUB_CLIENT_ID_DEV` / `GITHUB_CLIENT_SECRET_DEV` in development; no spaces in values.
- [ ] **Magic link** — Better Auth `magicLink` plugin + email provider (`RESEND_API_KEY`, `EMAIL_FROM`) + client plugin + login UI.
- [ ] **Google OAuth** — `socialProviders.google` + env client id/secret + GitHub-style waitlist gate.
- [ ] Waitlist UX: keep mapping only waitlist failures to `not_approved`; OAuth code/state failures stay `oauth_*`.

### Product UI (design gaps without full backend)
- [ ] **Org switcher** + create team (multi-org UX from dashboard design).
- [ ] **Billing** — plan upgrade checkout (Stripe/Dodo), invoices, payment method UI.
- [ ] **Project tokens** (CI `ENVY_TOKEN`) and **policy toggles** if/when API exists.
- [ ] Home “across all projects” activity feed (aggregate audit).
- [ ] Account profile as first-class route (`/dashboard/account`) vs preferences sheet only.

### Polish
- [ ] Command palette remaining visual parity (icons vs pure mono list).
- [ ] Mobile pass on landing + dashboard.
- [ ] Light theme tokens (product is dark-first; light still secondary).
- [ ] Refresh OG image / favicon deployment assets if needed.
- [ ] Delete or archive design HTML after team no longer needs local previews.

### Quality gates
- [ ] Manual smoke: login GitHub → onboarding → create project → secrets CRUD → CLI auth.
- [ ] `bun run check-types` + `bun run check` + targeted tests for auth session hooks.

## Out of scope (this redesign)
- CLI TUI theme in `packages/cli`
- Backend billing implementation
- SEO overhaul beyond landing copy/meta already updated

## Suggested next PR order
1. Stabilize GitHub OAuth in all environments (callback URL + secrets docs).
2. Ship `refactor/ui` stack as one PR (or Graphite stack by phase).
3. Magic link / Google as a separate auth PR.
4. Org switcher + billing when product needs multi-team.
