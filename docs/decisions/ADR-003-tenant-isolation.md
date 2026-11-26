# ADR-003 — Tenant Isolation

**Status:** ACCEPTED  
**Date proposed:** 2026-11-26  
**Date accepted:** 2026-11-26 (Australia/Brisbane)  
**Deciders:** Prince Ukaegbu  
**Related:** [SECURITY.md](../SECURITY.md), [DATA_MODEL.md](../DATA_MODEL.md), [preferences.md](../../preferences.md)

---

## Context

Tavelle must support:

- Organisation (tenant) isolation from day one **conceptually**  
- Users belonging to multiple orgs  
- Staff roles within an org  
- Client portal users scoped to a client within an org  
- Future branding, custom domains, module entitlements  

A common failure mode is trusting a client-supplied `orgId` or only filtering in the frontend.

Early operations: Prince uses Tavelle **invite-only** to manage the first few software clients (Dispatch Sites business wing as a branded org). Schema stays multi-tenant.

---

## Decision (accepted)

### Isolation model

**Shared database (D1), row-level tenancy** via mandatory `org_id` on all tenant-owned tables.

### Operational tenancy (Phases 1–4)

- **Invite-only** org provisioning — no self-serve public org signup  
- Prince (platform/operator path or seeded owner) creates orgs for early clients  
- Multi-tenant schema, memberships, and isolation tests still required  
- Self-serve signup deferred until productisation / public SaaS readiness  

### Tenant resolution

1. Authenticate session → `userId`  
2. Determine **actor kind**: staff membership vs portal membership  
3. Resolve **active org**:
   - Staff: from signed/httpOnly `active_org` cookie (or server session field), **verified** against `memberships`  
   - Portal: org implied by portal membership (usually single); if multiple, same verification pattern  
4. Build `TenantContext { orgId, actorUserId, actorKind, roles, clientId? }`  
5. All queries/mutations in org-scoped modules accept `TenantContext` (or `orgId` derived only from it)

### Portal isolation

Portal actors additionally constrained by `clientId`. Project/document lists join through that client. Approvals and messages inherit the same scope.

### Branding

Dispatch Sites (and any other HyperLynx wing or future tenant) appears via **`org_branding` / org config**, not hardcoded product identity.

### What is explicitly forbidden

- Authorizing solely via SPA route guards  
- Taking `orgId` from JSON body/query as the tenant source of truth  
- Cross-tenant unique constraints that assume a single org  
- Storing R2 objects without `org/{orgId}/` prefix  
- Self-serve open registration creating orgs in Phases 1–4  
- Dispatch Sites–specific core schema  

### Future hooks (not built now)

- Custom domains → hostname → `org_id` map table  
- Entitlements → `org_id` + module flags  
- Support impersonation → audited actor switch (platform operator)  
- Public self-serve org signup (after SECURITY public-signup checklist)

### Acceptance notes (Prince, 2026-11-26)

- Invite-only ops; multi-tenant schema kept  
- No mandatory DS/HyperLynx integration before portal MVP  

---

## Why necessary

- White-label path requires real isolation, not “we’ll add org_id later”  
- Portal expands attack surface to external users early  
- Row-level model is the smallest viable foundation on D1  
- Invite-only reduces abuse surface while schema stays correct  

---

## Alternatives considered

| Alternative | Pros | Cons | Verdict |
|-------------|------|------|---------|
| DB-per-tenant (separate D1) | Strong isolation | Migration ops, config explosion | Defer |
| Schema-per-tenant | Medium isolation | SQLite/D1 awkwardness | Reject |
| Single-tenant app until SaaS | Faster short-term | Guaranteed rewrite | Reject |
| Self-serve org signup from Phase 1 | Faster SaaS path | Abuse + premature productisation | **Rejected for Phases 1–4** |
| Only frontend org switcher | Easy | Insecure | Reject |
| Cloudflare Durable Objects per org | Strong compute isolation | Complexity | Not for MVP |

---

## Trade-offs

- Shared DB means bugs can leak data if filters are missed — **mitigate with required `orgId` in repos + automated IDOR tests**  
- Invite-only means operator toil for new orgs — acceptable for first few clients  
- Moving to DB-per-tenant later needs export/import tooling — acceptable planned evolution  

---

## Deferrable / reversible?

- Invite-only → self-serve signup: additive with abuse controls  
- Row-level → DB-per-tenant: reversible with investment  
- Adding hostname routing: additive  
- Sub-tenants / workspaces under an org: **defer**  

---

## Consequences

- Phase 1: org creation is **admin/invite-gated**, not public signup; still seed **two orgs in staging** to prove isolation  
- Phase 1 acceptance includes multi-org user + isolation tests  
- SECURITY.md “before real data” checklist includes cross-tenant test green  
- Public signup checklist remains gated until later phases  
