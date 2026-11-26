# Tavelle — Cloudflare deploy notes

**Audience:** Prince (account owner). Do not paste API tokens or auth secrets into chat.

## Prerequisites

- Cloudflare account (personal OK for now)
- Local clone with `pnpm install` green
- Auth via `wrangler login` **or** `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in your shell / GitHub Actions secrets

## Create staging resources (one-time)

```bash
cd apps/api
pnpm exec wrangler login   # interactive browser; skip if token already exported
pnpm exec wrangler d1 create tavelle-staging
pnpm exec wrangler r2 bucket create tavelle-files-staging
```

Copy the D1 `database_id` into `wrangler.toml` → `[env.staging]` (already set for current staging).

## Secrets (identity)

Never commit secrets. Put values via Wrangler (interactive prompt — value is not printed into chat/git):

```bash
cd apps/api
# Generate locally: openssl rand -base64 32
pnpm exec wrangler secret put BETTER_AUTH_SECRET --env staging
# When email provider is chosen:
# pnpm exec wrangler secret put EMAIL_API_KEY --env staging
```

Non-secret staging vars live in `wrangler.toml` `[env.staging.vars]`:

- `BETTER_AUTH_URL` — `https://tavelle-api-staging.ukbu88.workers.dev`
- `PLATFORM_ADMIN_EMAILS` — operator emails for invite-only org provisioning

Optional vars: `EMAIL_FROM`.

## Migrate + deploy

```bash
# from repo root
pnpm --filter @tavelle/web build
pnpm db:migrate:remote   # applies to D1 database_name tavelle-staging (--env staging)
pnpm deploy:staging
```

Staging Worker name: `tavelle-api-staging` on `*.workers.dev`. SPA assets are bound on the same Worker (`/api/*` runs the Worker first; other routes serve the SPA).

`db:migrate:remote` targets **`tavelle-staging`** (not the local `tavelle` name). Local migrate still uses `tavelle`.

## Verify

```bash
curl -sS https://tavelle-api-staging.ukbu88.workers.dev/api/health
# Open in browser:
# https://tavelle-api-staging.ukbu88.workers.dev/sign-in
```

Expect `bindings.d1` / `bindings.r2` true after migrate. Auth UI: `/sign-in`, `/sign-up`, `/app`.

## Prince follow-ups

1. Confirm `BETTER_AUTH_SECRET` is set on staging (rotate anytime with `wrangler secret put`).  
2. Pick transactional email (Resend / Postmark) and set `EMAIL_API_KEY` + `EMAIL_FROM` — until then magic/invite links are **logged** by the Worker.  
3. Keep `PLATFORM_ADMIN_EMAILS` accurate for who may provision orgs.

## CI deploy (optional next)

Add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then extend `.github/workflows/ci.yml` with a `main`-only deploy job.
