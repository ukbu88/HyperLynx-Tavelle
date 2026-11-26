# Tavelle

HyperLynx multi-tenant CRM and client portal — modular monolith on Cloudflare Workers, D1, and R2.

First operational user is the Dispatch Sites business wing; **do not hardcode Dispatch Sites branding** into app core (org branding/config later).

Phase 0 planning docs live in [`docs/`](./docs/). This repo scaffold is **Phase 1 foundation**: clone → install → local run, Worker deploy path, D1 + R2 bindings, CI basics. Identity/CRM product features come next.

## Prerequisites

- macOS (or Linux) with **Node.js 22+** (Active LTS)
- [pnpm](https://pnpm.io/) 10+
- Cloudflare account (for remote deploy only — not required for local)

## Clone and run (local)

```bash
git clone https://github.com/ukbu88/HyperLynx-Tavelle.git
cd HyperLynx-Tavelle
pnpm install
pnpm db:migrate:local
pnpm dev
```

| Process | URL |
|---------|-----|
| Web (Vite) | http://127.0.0.1:5173 |
| API (Wrangler) | http://127.0.0.1:8787 |
| Health | http://127.0.0.1:5173/api/health (proxied) or :8787/api/health |

Useful scripts:

| Script | Purpose |
|--------|---------|
| `pnpm dev` | API + web in parallel |
| `pnpm db:generate` | Drizzle Kit → SQL migrations |
| `pnpm db:migrate:local` | Apply migrations to local D1 |
| `pnpm typecheck` | `tsc` across packages |
| `pnpm test` | Vitest |
| `pnpm deploy:staging` | Build SPA + `wrangler deploy --env staging` |

## Environment

- Copy [`.env.example`](./.env.example) for documentation of variable names.
- Local Worker secrets go in `apps/api/.dev.vars` (gitignored). Start from `apps/api/.dev.vars.example`.
- **Never commit** API tokens, Better Auth secrets, or `.dev.vars`.

## Repository layout

```
apps/
  api/          # Hono on Cloudflare Workers
  web/          # React + Vite SPA (shell stub)
packages/
  contracts/    # Zod schemas + shared types
  db/           # Drizzle schema + migrations
  config/       # shared tsconfig bases
docs/           # Phase 0 product/architecture (source of truth in-repo)
tooling/scripts/
```

## Cloudflare deploy (staging / workers.dev)

Remote deploy needs **your** Cloudflare credentials. This cloud agent does **not** have them; do not paste tokens into chat.

Full checklist: [`docs/DEPLOY.md`](./docs/DEPLOY.md).

### One-time setup (Prince)

1. Install Wrangler globally or use the workspace binary:
   ```bash
   pnpm --filter @tavelle/api exec wrangler --version
   ```
2. Authenticate (pick one):
   ```bash
   pnpm --filter @tavelle/api exec wrangler login
   ```
   **or** create an API token with Workers/D1/R2 permissions and export in your shell / GitHub Actions secrets:
   ```bash
   export CLOUDFLARE_API_TOKEN=…   # set locally or in CI — do not commit
   export CLOUDFLARE_ACCOUNT_ID=…
   ```
3. Create resources:
   ```bash
   cd apps/api
   pnpm exec wrangler d1 create tavelle-staging
   pnpm exec wrangler r2 bucket create tavelle-files-staging
   ```
4. Paste the returned D1 `database_id` into `apps/api/wrangler.toml` under `[env.staging]` (`REPLACE_WITH_STAGING_D1_ID`).
5. Build + migrate + deploy:
   ```bash
   pnpm --filter @tavelle/web build
   pnpm db:migrate:remote
   pnpm deploy:staging
   ```
6. Confirm `https://tavelle-api-staging.<your-subdomain>.workers.dev/api/health`.

Custom domains come later; use `workers.dev` for now.

### Deploy status from this agent

**Blocked:** no `CLOUDFLARE_API_TOKEN` / Wrangler login in the agent environment. Local path and CI are implementable without it.

## Auth / secrets blockers (later Phase 1)

Not wired in this foundation PR. When identity lands:

- `BETTER_AUTH_SECRET` via `wrangler secret put`
- Email provider key when magic links leave the log-stub
- Prefer same-origin `/api` cookies (already the deploy shape)

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs install → typecheck → test on PRs and `main`.

## License / ownership

Private HyperLynx product repository (`ukbu88/HyperLynx-Tavelle`).
