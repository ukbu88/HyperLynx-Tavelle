# ADR-001 — Technology Stack

**Status:** ACCEPTED  
**Date proposed:** 2026-11-26  
**Date accepted:** 2026-11-26 (Australia/Brisbane)  
**Deciders:** Prince Ukaegbu  
**Related:** [ARCHITECTURE.md](../ARCHITECTURE.md), [preferences.md](../../preferences.md)

---

## Context

Tavelle needs a stack that:

- Keeps ops cost near-zero at low traffic  
- Gives strong local macOS DX for a solo founder + AI assistance  
- Supports a modular monolith and multi-tenant data model  
- Prefers mature, documented tools over novelty  
- Deploys cleanly to Cloudflare  

---

## Decision (accepted)

Adopt:

| Concern | Choice |
|---------|--------|
| Language | TypeScript end-to-end |
| Web | React + Vite SPA |
| API | Hono on Cloudflare Workers |
| DB | D1 + Drizzle ORM + Drizzle Kit migrations |
| Objects | R2 |
| Validation / contracts | Zod in `packages/contracts` |
| Auth library | **Better Auth** (spike in Phase 1); fallback Auth.js / thin session layer only if spike fails |
| Auth methods (v1) | **Magic link and password** (staff + portal as appropriate) |
| Currency (when financials ship) | **AUD only** to start; integer minor units |
| Deploy | **Cloudflare** Workers + D1 + R2 (**confirmed**) |
| Repo | pnpm workspaces monorepo |
| CI/CD | GitHub Actions → Wrangler deploy |
| Email (transactional) | Provider TBD (Resend / Postmark) — pick at portal invite phase |

### Acceptance notes (Prince, 2026-11-26)

- Cloudflare deploy target confirmed  
- Better Auth spike accepted  
- Magic link **and** password required for v1  
- AUD-only financials to start  

---

## Why necessary

- One language reduces context switching for AI-assisted solo development  
- Workers + D1 + R2 match low-ops Cloudflare preference  
- Drizzle is SQL-first and fits SQLite/D1 better than Prisma historically  
- Shared Zod contracts enforce explicit API boundaries  
- SPA + API separation keeps presentation off business logic  

---

## Alternatives considered

| Alternative | Pros | Cons | Verdict |
|-------------|------|------|---------|
| Next.js on Cloudflare | Integrated routing | Runtime compatibility friction; heavier | Reject for core app now |
| Remix / TanStack Start | Good full-stack DX | Less proven on Workers for this use; couples UI/API | Defer |
| Node (Fly/Railway) + Postgres | Excellent ecosystem | Higher baseline cost/ops | Keep as escape hatch |
| Bun runtime | Fast local | Cloudflare deploy target is Workers, not Bun | Local-only tooling OK; not API runtime |
| Prisma | Familiar | D1 support historically weaker | Prefer Drizzle |
| Paid auth (Clerk/Auth0) | Fast | Cost, admin, data residency, lock-in | Avoid as hard dependency |
| Raw SQL only | Simple | No type safety; slower AI-safe refactors | Reject |
| Turborepo mandatory | Caching | Extra moving part | Optional; pnpm scripts enough at start |
| Magic-link only | Lower friction | Prince requires password as well | Rejected for v1 |

---

## Trade-offs

- **D1/SQLite limits:** no heavy analytical queries; fine for CRM MVP; revisit if reporting becomes central  
- **Workers CPU/time limits:** avoid long PDF generation in-request; use deferred work later  
- **Better Auth maturity:** newer than Auth.js — Phase 1 spike still required; swap cost contained if sessions stay behind `identity`  
- **SPA SEO:** irrelevant for app; marketing site can be separate static later  
- **AUD-only:** simplifies invoices; multi-currency deferred  

---

## Deferrable / reversible?

| Piece | Reversible? | Notes |
|-------|-------------|-------|
| Vite SPA → meta-framework | Medium | Keep data fetching in API client |
| D1 → Postgres | Medium-Hard | Drizzle helps; still a migration project |
| Hono → another HTTP lib | Easy | Thin handlers |
| Better Auth ↔ Auth.js | Medium | Abstract in `identity` early |
| Cloudflare → Fly | Hardish | Only if platform limits bite |
| AUD → multi-currency | Medium | Design money columns with `currency` field even if always `AUD` |

---

## Spike criteria (Phase 1 gate)

Before building CRM tables, prove:

1. Email/password register + login on Worker + D1  
2. Magic-link send/accept round-trip (log link locally if email stubbed)  
3. Session cookie round-trip from Vite dev proxy  
4. Migration apply local + remote  
5. One authenticated org-scoped CRUD route  

If Better Auth fails the spike within a short timebox, switch to fallback without rewriting product architecture.

---

## Consequences

- Phase 1 implements the spike; amend this ADR only if the library changes  
- All modules use Drizzle schemas in `packages/db`  
- No paid infra required to develop or demo the spine  
- GitHub repo name/owner and Cloudflare account are **Phase 1 setup blockers**, not stack undecided items  
