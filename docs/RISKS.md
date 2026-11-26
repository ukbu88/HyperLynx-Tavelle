# Tavelle — Risk Register & Remaining Decisions (Phase 0)

**Status:** Phase 0 decisions locked (2026-11-26, Australia/Brisbane)  

---

## 1. Architectural risks (still active)

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|--------|------------|------------|
| R1 | Client-supplied or frontend-only tenant context leaks data | Critical | Medium if undisciplined | ADR-003 ACCEPTED; mandatory `TenantContext`; IDOR tests as release gate |
| R2 | Better Auth immature / poor Workers+D1 fit (spike fails) | High | Medium | Timeboxed Phase 1 spike; fallback Auth.js / thin session layer (ADR-001) |
| R3 | D1 limits (size, concurrency, analytics) block later growth | Medium | Low–Medium early | Keep SQL portable via Drizzle; export path; metric-triggered Postgres escape |
| R4 | Modular monolith becomes undeclared ball of mud | High | Medium | Module folders + lint import boundaries; MODULES.md rules |
| R5 | Dispatch Sites–specific modelling creeps into core | High | Medium | Locked: branding/config only; reject DS-named core entities in review |
| R6 | Portal ships without hardened isolation | Critical | Medium under schedule pressure | Phase 4 acceptance requires automated isolation suite |
| R7 | Overengineering (queues, microservices, plugin systems) delays MVP | High | Medium with AI enthusiasm | Roadmap temptations list; challenge in review |
| R8 | Cookie/CORS misconfig on split domains breaks auth | Medium | Medium | Prefer same-origin `/api` (DEVELOPMENT.md) |
| R9 | File uploads become malware / abuse vector | High | Medium at Phase 5 | SECURITY checklist; type/size limits; scan strategy |
| R10 | Solo-founder bus factor / secret loss | High | Low–Medium | Documented recovery; GitHub + CF access hygiene |
| R11 | Money handled as floats despite AUD-only lock | Medium | Low if disciplined | Integer minor units + reject non-AUD (DATA_MODEL) |
| R12 | AI-generated permission filters look correct but aren’t | High | Medium | Prefer integration tests; never trust UI-only checks |
| R13 | Invite-only ops accidentally ships a public signup route | Medium | Low–Medium | Phase 1 acceptance: org create is admin/invite gated |

---

## 2. Product / scope risks

| ID | Risk | Mitigation |
|----|------|------------|
| P1 | Building full CRM before spine works | Enforce Phase 4 MVP gate |
| P2 | Polished UI work displaces tenancy/contracts | No visual design in Phase 0–3 beyond functional forms |
| P3 | White-label requirements unknown → wrong abstractions | Hooks only (branding fields, entitlements table later); no plugin runtime |
| P4 | Client portal expectations exceed read-only progress | Explicit Phase 4 scope; approvals can be thin (status flip) |

---

## 3. Locked decisions (was unresolved)

| ID | Topic | Locked decision (2026-11-26) |
|----|-------|------------------------------|
| U1 | Auth library | Better Auth spike **accepted** (fallback only if spike fails) |
| U2 | Org creation | **Invite-only** for Phases 1–4; multi-tenant schema kept; no self-serve signup |
| U3 | Auth methods | **Magic link and password** for v1 |
| U6 | Currency | **AUD only** to start |
| U9 | HyperLynx / DS coupling | Independent product; DS via branding; **no** required integration before portal MVP |
| — | Deploy | Cloudflare Workers + D1 + R2 **confirmed** |

---

## 4. Remaining decisions (truly open — not setup logistics)

These can wait; they do **not** block Phase 1 kickoff once GitHub/CF are ready:

| ID | Topic | Current lean | When it matters |
|----|-------|--------------|-----------------|
| U4 | Same-origin `/api` vs API subdomain | Same-origin | Domain/DNS setup |
| U5 | Email vendor (Resend vs Postmark) | Decide at Phase 4 | Portal invites in staging/prod |
| U7 | Keep `tasks` as separate module folder | Yes, separate | Phase 3 |
| U8 | Custom domains timing | Phase 8 | White-label marketing |
| U10 | Production readiness bar for first real PII | SECURITY checklist | Before portal with real clients |
| U11 | CSRF pattern with Better Auth cookies | Document at implement time | Phase 1 spike |
| U12 | Staging WAF / rate-limit parity with prod | Recommended yes for portal testing | Phase 4 |
| U13 | MFA timing for owners | Deferred until financials / public SaaS | Phase 7+ |

**Not architecture — Phase 1 setup blockers:** GitHub repo name/owner, Cloudflare account access, domain purchase/timing. See [PHASE-0-SUMMARY.md](./PHASE-0-SUMMARY.md).

---

## 5. Incompatible / discouraged tech pairings

- **Prisma + D1** as default — prefer Drizzle  
- **Next.js App Router on Workers** as the core modular monolith — compatibility tax  
- **Clerk/Auth0 + “we own tenancy”** — double source of org truth (avoid)  
- **Kafka / temporal / microservices** before a single Worker hurts  
- **GraphQL day one** — REST/JSON + Zod is enough  

---

## 6. Reversibility summary

| Decision | Reversible? |
|----------|-------------|
| Modular monolith | Split later if needed |
| Shared D1 row tenancy | Migrate to DB-per-tenant with export tooling |
| Invite-only → self-serve signup | Additive with abuse controls |
| Vite SPA | Replace shell later |
| Magic link + password | Add MFA later |
| AUD-only | Add currencies later (`currency` column ready) |
| Stub email | Swap provider |
| Deferred sales/financials | Additive modules |

Harder to reverse: **floating-point money**, **single-tenant schema without org_id**, **trusting client org id**, **Dispatch-specific primary keys in core**.
