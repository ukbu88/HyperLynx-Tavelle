# Tavelle — Local Development & Deploy (Phase 0)

**Status:** Phase 0 decisions locked (2026-11-26, Australia/Brisbane)  
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [ADR-001](./decisions/ADR-001-technology-stack.md) (ACCEPTED)

---

## 1. Goals

- **Clone-and-run** on macOS with Node LTS + pnpm  
- Same schema locally and on Cloudflare via Wrangler  
- Solo founder + AI-friendly: typed monorepo, fast feedback  
- No cloud resources required to develop the spine (email can log links locally)

---

## 2. Proposed repository layout

```
tavelle/
  apps/
    web/                      # Vite + React + TS
      src/
        app/                  # business experience routes
        portal/               # portal experience routes
        shell/                # session, org switcher, branding hooks
        shared/
    api/                      # Hono Worker
      src/
        middleware/
        modules/
          identity/
          orgs/
          memberships/
          permissions/
          crm/
          projects/
          tasks/
          portal/
          activity/
        index.ts
      wrangler.toml
  packages/
    contracts/                # Zod schemas + types
    db/                       # Drizzle schema + migrations
    config/                   # tsconfig, eslint
  tooling/scripts/
  .github/workflows/ci.yml
  package.json
  pnpm-workspace.yaml
  README.md
```

Repository: [ukbu88/HyperLynx-Tavelle](https://github.com/ukbu88/HyperLynx-Tavelle). Phase 1 scaffolds this layout; see root [README.md](../README.md).

---

## 3. Toolchain (locked defaults)

| Tool | Default |
|------|---------|
| Node | Active LTS |
| Package manager | pnpm |
| API dev | `wrangler dev` |
| Web dev | `vite` with proxy `/api` → Worker |
| DB | Wrangler local D1 |
| Migrations | `drizzle-kit generate` / `apply` via wrangler |
| Env | `apps/api/.dev.vars` (gitignored) |

Optional: Turborepo for task caching once CI times hurt.

---

## 4. Day-1 developer workflow (target)

```bash
git clone <repo>
cd tavelle
pnpm install
pnpm db:migrate:local
pnpm dev          # runs api + web
```

Scripts (illustrative):

- `dev` — concurrently web + api  
- `db:generate` — drizzle-kit generate  
- `db:migrate:local` — apply to local D1  
- `db:migrate:remote` — apply to staging/prod (CI or explicit)  
- `test` — vitest  
- `typecheck` — `tsc -b`  
- `lint` — eslint  
- `deploy:staging` — wrangler deploy + pages deploy  

---

## 5. Environment strategy

| Env | Purpose | Data |
|-----|---------|------|
| local | Feature work | Disposable D1 local |
| staging | Shared demo / acceptance | Separate D1 + R2 bucket |
| production | Real tenants | Separate D1 + R2; locked secrets |

Never share production D1 with staging. Wrangler environments (`--env staging`) keep config honest.

---

## 6. Cloudflare deploy strategy

**Deploy target confirmed:** Cloudflare Workers + D1 + R2.

1. **API Worker** deploy from `apps/api` with D1 and R2 bindings.  
2. **Web** as Cloudflare Pages project **or** Workers static assets bound to same route design. Prefer **one domain** with `/api/*` → Worker and `/*` → SPA to simplify cookies.  
3. GitHub Actions: on PR → typecheck/test; on main → deploy staging; production deploy manual or tagged release.  
4. Secrets via `wrangler secret put` (session secret, email API key).  

### Phase 1 setup blockers (not architecture)

Before first remote deploy: **GitHub repo name/owner**, **Cloudflare account** access, and **domain timing** (can use Workers/Pages preview hostnames until a custom domain is ready).

### Cookie / URL default

**Default:** app host serves SPA; API on same host path `/api`. Avoids cross-site cookie complexity.

Alternative: `api.` subdomain — only if SameSite/CORS carefully configured.

---

## 7. Email in development

- Local: invite/magic links printed to Worker logs + optional Ethereal/Mailpit later  
- Auth v1 must exercise **both** magic link and password paths  
- Staging/prod: Resend or Postmark (pick at Phase 4)  

Do not block Phase 1 on email vendor signup; stub the port. Org creation remains invite/admin gated.

---

## 8. macOS DX notes

- Prefer native Node over Docker for the default path (fewer moving parts)  
- Docker optional later for Mailpit or parity experiments  
- Apple Silicon: Wrangler/Miniflare well supported; document any sharp/native deps avoidance (prefer Web Crypto)

---

## 9. AI-assisted development norms

- Generate code inside module boundaries  
- Always add/adjust Zod contracts when changing API  
- Prefer running typecheck + targeted tests after AI edits  
- Never commit `.dev.vars` or Wrangler state with secrets  

---

## 10. Decisions

| Decision | Why | Alternative | Reversible? |
|----------|-----|-------------|-------------|
| Cloudflare Workers + D1 + R2 | Locked 2026-11-26 | Fly/Postgres | Hardish |
| pnpm workspaces | Fast, strict, common | npm/yarn | Easy early |
| SPA + Worker vs full-stack meta | Clear separation; CF-friendly | Next/Remix | Medium |
| Same-origin `/api` | Simpler auth cookies | Split subdomains | Medium |
| Invite-only org create | Locked ops model | Public signup | Easy later |
| Stub email locally | Unblocks invites | Require SaaS email day one | Easy |

### Overengineering to avoid

- Terraform for early Cloudflare — use Wrangler + dashboard until multi-env pain appears  
- Nx monorepo — too heavy  
- Shared UI component library before design phase — premature  
