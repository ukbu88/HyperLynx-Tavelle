# Tavelle — Testing Strategy (Phase 0)

**Status:** Phase 0 decisions locked (2026-11-26, Australia/Brisbane) — strategy unchanged  

---

## 1. Goals

- Prove **tenant and portal isolation** continuously (highest risk)  
- Keep feedback fast for solo + AI-assisted development  
- Prefer tests that lock **contracts and AuthZ** over brittle UI snapshots  
- No visual regression requirement in early phases (no polished UI yet)

---

## 2. Test pyramid

| Layer | Tools (proposed) | What |
|-------|------------------|------|
| Unit | Vitest | Permission maps, pure domain helpers, Zod parse cases |
| Integration | Vitest + Hono `app.request` + local D1 | Routes with real middleware + DB |
| Contract | Vitest | Shared schemas reject invalid payloads |
| E2E (thin) | Playwright (from Phase 4) | Spine happy path + one isolation fail case |
| Manual | Checklist per phase | Acceptance criteria in ROADMAP |

**Avoid early:** heavy Cypress setups, screenshot diffs, load testing.

---

## 3. Mandatory security tests

These are **release gates** from Phase 2 onward (Phase 1 for org isolation):

1. **Cross-tenant IDOR:** as user in Org A, request Org B’s client/project by UUID → 404  
2. **Forged org context:** authenticated request with attacker-chosen org id → ignored/rejected  
3. **Portal horizontal privilege:** portal user for Client A cannot read Client B in same org  
4. **Role denial:** `viewer` cannot mutate; `portal_client` cannot hit staff-only routes  
5. **Invite token:** expired/reused token fails  

Implement as integration tests against the Hono app; do not rely on E2E alone.

---

## 4. Per-phase testing expectations

| Phase | Minimum |
|-------|---------|
| 1 | Permission helper unit tests; session + org switch integration |
| 2 | Client CRUD + cross-tenant IDOR |
| 3 | Project/task AuthZ; activity write smoke |
| 4 | Portal isolation suite; Playwright spine path |
| 5 | Upload authz; portal share flag |
| 6–7 | Money integer invariants; invoice permission tests |
| 8 | Entitlement flag gates |

---

## 5. Local & CI

- `pnpm test` runs unit + integration with Wrangler/Miniflare D1 or in-memory where feasible  
- CI on GitHub Actions: typecheck, lint, test on every PR  
- E2E on main/staging nightly or on Phase 4+ PRs that touch portal  

Seed helper: create Org A/B, users, clients for isolation fixtures — owned by `tooling/scripts` or test utils.

---

## 6. What not to test yet

- Pixel-perfect layout  
- Cloudflare edge latency  
- Third-party email deliverability (assert provider adapter called)  
- AI feature outputs  

---

## 7. Decisions

| Decision | Why | Alternative |
|----------|-----|-------------|
| Integration via `app.request` | Fast, no browser flakiness | Only E2E |
| Playwright from Phase 4 | Portal UX needs one true browser proof | Defer E2E entirely — riskier for invites |
| Isolation as hard gate | Data leak is existential for CRM | Manual only — insufficient |

**Deferrable:** mutation testing, contract tests against OpenAPI (can generate OpenAPI from routes later).
