# Tavelle — Cloudflare deploy notes (Phase 1)

**Audience:** Prince (account owner). Do not paste API tokens into chat or commit them.

## Prerequisites

- Cloudflare account (personal OK for now)
- Local clone with `pnpm install` green
- Auth via `wrangler login` **or** `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in your shell / GitHub Actions secrets

## Create staging resources

```bash
cd apps/api
pnpm exec wrangler login   # interactive browser; skip if token already exported
pnpm exec wrangler d1 create tavelle-staging
pnpm exec wrangler r2 bucket create tavelle-files-staging
```

Copy the D1 `database_id` into `wrangler.toml` → `[env.staging]` → replace `REPLACE_WITH_STAGING_D1_ID`.

## Migrate + deploy

```bash
# from repo root
pnpm --filter @tavelle/web build
pnpm db:migrate:remote
pnpm deploy:staging
```

Staging Worker name: `tavelle-api-staging` on `*.workers.dev`. SPA assets are bound on the same Worker (`/api/*` runs the Worker first; other routes serve the SPA).

## Verify

```bash
curl -sS https://tavelle-api-staging.<account>.workers.dev/api/health
```

Expect `bindings.d1` / `bindings.r2` true after migrate.

## CI deploy (optional next)

Add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then extend `.github/workflows/ci.yml` with a `main`-only deploy job. Not required for foundation acceptance.

## Blocked without credentials

Cloud agents without Wrangler login / token **cannot** complete remote create/deploy. Local `wrangler dev` + D1 local migrations do not need Cloudflare auth.
