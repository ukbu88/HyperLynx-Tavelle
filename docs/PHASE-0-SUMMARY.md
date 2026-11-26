# Tavelle Phase 0 — Summary Index

**Status:** Decisions locked (2026-11-26, Australia/Brisbane)  
**Scope:** Architecture & product planning only — no implementation  

---

## Locked foundation

- **Shape:** Modular monolith on Cloudflare — React+Vite SPA + Hono Worker + D1 + R2 + Zod + Drizzle + pnpm workspaces  
- **Deploy:** Cloudflare Workers, D1, R2 (**confirmed**)  
- **Tenancy schema:** Shared D1 with mandatory `org_id`; server-resolved `TenantContext` (never frontend-only / body `orgId`)  
- **Tenancy ops (Phases 1–4):** **Invite-only** — Prince provisions orgs for the first few software clients; **no self-serve org signup**. Multi-tenant schema retained.  
- **MVP spine:** Org → client → project → tasks → portal invite → secure client view (Phases 1–4)  
- **Auth:** Better Auth spike **accepted**; v1 supports **magic link and password**  
- **Currency:** **AUD only** to start (integer minor units when financials ship)  
- **Product identity:** Tavelle is a **HyperLynx product**; first used by the Dispatch Sites business wing. Independent product — DS appears via **org branding/config**, never hardcoded in app core  
- **Ops:** Same-origin `/api`, stub email locally, ~USD $0–30/mo at initial staging/prod  

ADRs **001–003** are **ACCEPTED** (2026-11-26, Australia/Brisbane). See [preferences.md](../preferences.md).

---

## Deliverables

| # | Doc | Path |
|---|-----|------|
| 1 | Product specification | [PRODUCT.md](./PRODUCT.md) |
| 2 | Stack + trade-offs | [ARCHITECTURE.md](./ARCHITECTURE.md), [ADR-001](./decisions/ADR-001-technology-stack.md) |
| 3 | System architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| 4 | Repository structure | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| 5 | Module boundaries | [MODULES.md](./MODULES.md), [ADR-002](./decisions/ADR-002-module-boundaries.md) |
| 6 | Data model / ERD | [DATA_MODEL.md](./DATA_MODEL.md) |
| 7 | AuthN/AuthZ | [SECURITY.md](./SECURITY.md), [ARCHITECTURE.md](./ARCHITECTURE.md) |
| 8 | Multi-tenancy | [ADR-003](./decisions/ADR-003-tenant-isolation.md) |
| 9 | Local + Cloudflare deploy | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| 10 | Phased roadmap | [ROADMAP.md](./ROADMAP.md) |
| 11 | Testing strategy | [TESTING.md](./TESTING.md) |
| 12 | Risks + remaining decisions | [RISKS.md](./RISKS.md) |
| 13 | Infra cost estimate | [COSTS.md](./COSTS.md) |

### ADRs (ACCEPTED)

- [ADR-001 — Technology stack](./decisions/ADR-001-technology-stack.md)  
- [ADR-002 — Module boundaries](./decisions/ADR-002-module-boundaries.md)  
- [ADR-003 — Tenant isolation](./decisions/ADR-003-tenant-isolation.md)  

---

## Locked decisions (was: open questions 1–5)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Tenancy ops | Invite-only for Phases 1–4; multi-tenant schema; no self-serve org signup |
| 2 | Auth methods | Magic link **and** password for v1 |
| 3 | Currency | AUD only to start |
| 4 | Auth library | Better Auth spike accepted (fallback still documented if spike fails) |
| 5 | External coupling | No HyperLynx/Dispatch Sites system must integrate before portal MVP; DS via branding only |

### Still locked architecture defaults (unchanged)

| Area | Decision |
|------|----------|
| App shape | SPA + Hono API modular monolith |
| MVP order | Foundation → CRM → Delivery → Portal (sales/financials later) |
| API URL | Same-origin `/api` |
| Events/queues | None until proven need |
| UI in early phases | Functional, unpolished — no design system yet |

---

## Phase 1 setup blockers (not architecture)

These do **not** reopen architecture; they block kicking off implementation:

1. **GitHub** repo name and owner/org  
2. **Cloudflare** account (and who holds staging/prod access)  
3. **Domain** timing (when to buy/point DNS — can develop on `*.workers.dev` / Pages preview until then)  

Secondary non-blocking: email vendor (Resend vs Postmark) at Phase 4; whether `tasks` stays a separate module folder; custom-domain marketing timing (Phase 8).

---

## What was challenged (still stands)

- **Sales-first CRM roadmap** → deferred behind delivery + portal spine  
- **Microservices / event bus / plugin runtime** → rejected for Phase 0–8 foundation  
- **Single-tenant “we’ll add orgs later”** → rejected; row-level tenancy from Phase 1 with invite-only ops  
- **Hardcoding Dispatch Sites** → rejected; branding/config only  

---

## Next step

Phase 0 architecture is accepted. Before Phase 1 code: resolve GitHub repo + Cloudflare account (and optionally domain). Then create the application repository and run the Better Auth + Workers/D1 foundation spike.
