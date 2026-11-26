# Tavelle

HyperLynx multi-tenant CRM and client portal — modular monolith on Cloudflare Workers, D1, and R2.

First operational user is the Dispatch Sites business wing; **do not hardcode Dispatch Sites branding** into app core (org branding/config later).

Phase 0 planning docs live in [`docs/`](./docs/). This branch adds **identity & tenancy**: Better Auth (password + magic link), invite-only orgs, memberships, permissions, and TenantContext enforcement.

## Prerequisites

- macOS (or Linux) with **Node.js 22+** (Active LTS)
- [pnpm](https://pnpm.io/) 10+
- Cloudflare account (for remote deploy only — not required for local)

## Clone and run (local)

```bash
git clone https://github.com/ukbu88/HyperLynx-Tavelle.git
cd HyperLynx-Tavelle
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars   # set PLATFORM_ADMIN_EMAILS + secret
pnpm db:migrate:local
pnpm dev
```

| Process | URL |
|---------|-----|
| Web (Vite) | http://127.0.0.1:5173 |
| API (Wrangler) | http://127.0.0.1:8787 |
| Sign in | http://127.0.0.1:5173/sign-in |
| Health | http://127.0.0.1:5173/api/health (proxied) |

Useful scripts:

| Script | Purpose |
|--------|---------|
| `pnpm dev` | API + web in parallel |
| `pnpm db:generate` | Drizzle Kit → SQL migrations |
| `pnpm db:migrate:local` | Apply migrations to local D1 |
| `pnpm typecheck` | `tsc` across packages |
| `pnpm test` | Vitest (incl. permission helper) |
| `pnpm deploy:staging` | Build SPA + `wrangler deploy --env staging` |

## Auth & tenancy

- **Accounts:** Better Auth email/password + magic link (`/api/auth/*`)
- **Orgs:** invite-only provisioning via `PLATFORM_ADMIN_EMAILS` (no public self-serve org signup)
- **Staff invites:** hashed tokens; accept at `/accept-invite` (URL also logged when email is stubbed)
- **TenantContext:** active org cookie verified against memberships on every org-scoped request
- Spike notes + fallback: [`docs/AUTH-SPIKE.md`](./docs/AUTH-SPIKE.md)

## Environment

- Copy [`.env.example`](./.env.example) for documentation of variable names.
- Local Worker secrets go in `apps/api/.dev.vars` (gitignored). Start from `apps/api/.dev.vars.example`.
- **Never commit** API tokens, Better Auth secrets, or `.dev.vars`.

## Repository layout

```
apps/
  api/          # Hono on Cloudflare Workers (identity, orgs, memberships, notes)
  web/          # React + Vite SPA (auth + workspace shell)
packages/
  contracts/    # Zod schemas + permission helpers
  db/           # Drizzle schema + migrations
  config/       # shared tsconfig bases
docs/           # Phase 0 product/architecture + AUTH-SPIKE / DEPLOY
```

## Cloudflare deploy (staging / workers.dev)

Full checklist: [`docs/DEPLOY.md`](./docs/DEPLOY.md).

Staging: https://tavelle-api-staging.ukbu88.workers.dev

```bash
pnpm --filter @tavelle/web build
pnpm db:migrate:remote
# once: pnpm --filter @tavelle/api exec wrangler secret put BETTER_AUTH_SECRET --env staging
pnpm deploy:staging
```

## Prince follow-ups

1. Confirm / rotate `BETTER_AUTH_SECRET` on staging (`wrangler secret put`).  
2. Choose email provider (Resend/Postmark) and set `EMAIL_API_KEY` + `EMAIL_FROM` — until then magic/invite links are Worker-logged.  
3. Keep `PLATFORM_ADMIN_EMAILS` accurate.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs install → typecheck → test on PRs and `main`.

## License / ownership

Private HyperLynx product repository (`ukbu88/HyperLynx-Tavelle`).
