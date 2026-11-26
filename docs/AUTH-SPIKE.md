# Better Auth spike (Workers + D1) — Phase 2 identity

**Date:** 2026-11-26 (Australia/Brisbane)  
**Related:** [ADR-001](./decisions/ADR-001-technology-stack.md), [SECURITY.md](./SECURITY.md)

## Result

**Spike passed.** Better Auth runs on Cloudflare Workers + D1 with:

1. Email/password register + login  
2. Magic link send/accept (email stub logs the URL when `EMAIL_API_KEY` is unset)  
3. Session cookie round-trip (same-origin `/api` on staging; Vite proxy locally with `changeOrigin: false`)  
4. Migrations apply local + remote  
5. Authenticated org-scoped CRUD: `GET/POST /api/notes` constrained by `TenantContext`

Library: `better-auth` + `@better-auth/drizzle-adapter` (sqlite/D1). Identity stays behind `apps/api/src/modules/identity/`.

## Fallback (if this ever regresses)

If Better Auth breaks on Workers/D1 in a way we cannot fix quickly:

1. Amend ADR-001 status note to Auth.js / thin session layer.  
2. Keep `user` / `session` tables conceptually; swap only `identity` module.  
3. Keep memberships, invitations, `TenantContext`, and permission helpers unchanged.

No product architecture rewrite required — that was the ADR-001 containment goal.

## Platform admin gate

`PLATFORM_ADMIN_EMAILS` alone is not enough: `isPlatformAdmin` also requires
`emailVerified === true` (mailbox ownership). Password signup does not verify
email; use magic link (or another verified path) before org provision / seed.

## Secrets (never paste into chat)

```bash
cd apps/api
# Interactive — paste when prompted (value never echoed into git/chat)
pnpm exec wrangler secret put BETTER_AUTH_SECRET --env staging
# Optional later:
# pnpm exec wrangler secret put EMAIL_API_KEY --env staging
```

Set non-secret vars in `wrangler.toml` `[env.staging.vars]`:

- `BETTER_AUTH_URL` — staging workers.dev origin  
- `PLATFORM_ADMIN_EMAILS` — comma-separated operator emails for org provisioning  

Local: copy `apps/api/.dev.vars.example` → `.dev.vars`.
