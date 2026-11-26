# Tavelle — Product Specification (Phase 0)

**Status:** Phase 0 decisions locked (2026-11-26, Australia/Brisbane)  
**Audience:** Prince Ukaegbu (HyperLynx Software)  
**Timezone context:** Australia/Brisbane  

---

## 1. What Tavelle is

Tavelle is a **modular, cloud-native CRM and operations workspace** for service businesses. It helps a business manage clients, projects, delivery, and commercial artefacts in one place, with an optional **client portal** so customers can see progress, approve work, and handle documents and invoices.

**Product identity:** Tavelle is a **HyperLynx product**. First operational use is the **Dispatch Sites** business wing, which appears as an organisation via **branding/config** — never hardcoded into app core.  
**Strategic path:** same independent product becomes a **standalone multi-tenant white-label** offering — not a Dispatch Sites–specific CRM that must be rebuilt.  
**Early ops:** invite-only org provisioning for the first few software clients; multi-tenant schema from day one.

---

## 2. Product philosophy (non-negotiable)

| Principle | Implication |
|-----------|-------------|
| Simplicity before sophistication | Ship a modular monolith; add queues, microservices, and event buses only when a concrete pain appears |
| Modularity without unnecessary abstraction | Clear module folders and dependency rules; no plugin runtime or DI framework until needed |
| Explicit data contracts | Shared Zod schemas between API and UI; no “whatever the form posted” |
| Reliable software before AI | Core CRUD, permissions, and workflows must work without AI; AI is an amplifier later |
| Separation of concerns | Business logic ≠ infrastructure ≠ presentation |
| Low ops cost | Prefer Cloudflare-native primitives; clone-and-run local DX |
| Incremental, no dead ends | Multi-tenant schema and module boundaries from day one, even when ops are invite-only for a few orgs |
| Data portability | Own the schema; exportable tenant data; avoid lock-in to opaque SaaS cores |
| Software adapts to how businesses operate | Configurable labels/workflows later; do not hard-code Dispatch Sites process into the domain model |

---

## 3. Users and experiences

### 3.1 Business workspace (staff)

For people who run the business (owners, PMs, sales, ops):

- Clients and contacts  
- Leads and opportunities  
- Projects, tasks, milestones  
- Proposals / quotes  
- Invoices and payments  
- Documents  
- Communications (threaded, attributable)  
- Recurring services  
- Notes and activity feed  
- Org settings, members, roles, permissions  

### 3.2 Client portal (external customers)

For invited client users, scoped to **their** relationship with the org:

- View projects and services  
- See progress  
- Approve deliverables  
- Access shared documents  
- View quotes and invoices  
- Communicate with the business  
- Manage own account info  

Portal access is **invitation-based** and **org + client scoped**. A portal user must never see another client’s data within the same tenant.

### 3.3 Platform operator (future)

HyperLynx / Tavelle operator concerns (billing tenants, feature flags, support impersonation) are **out of Phase 0–4 MVP**. Design module boundaries so they can appear later without rewriting tenancy.

---

## 4. First useful product (MVP spine)

Smallest path that is genuinely useful:

1. Create a **business account** (organisation)  
2. Add a **customer** (client + primary contact)  
3. Create a **project** under that client  
4. Track **tasks / progress**  
5. **Invite** the customer to the portal  
6. Customer **securely views** project progress  
7. Business continues to **manage the relationship** (notes, activity)

Everything else (sales pipeline, invoices, recurring services, white-label domains) is sequenced after this spine is trustworthy.

**Explicit non-goals for MVP:** AI assistants, mobile apps, marketplace integrations, custom domain branding, multi-region, advanced reporting, email sync, payment gateway settlement, Dispatch Sites–specific domain objects.

---

## 5. Personas (lightweight)

| Persona | Goal | Primary surface |
|---------|------|-----------------|
| Business owner / admin | Set up org, invite staff, control access | Business workspace — settings |
| Project / account manager | Run client work, keep portal truthful | Business workspace — CRM + projects |
| Client contact | See status without chasing email | Client portal |
| Solo founder (builder) | Ship increments safely with AI assist | Local + Cloudflare deploy |

---

## 6. Success criteria (product)

Phase 0 is **complete** (decisions locked 2026-11-26): MVP definition, stack, tenancy, ADRs, and roadmap accepted.

Post–Phase 4 (implementation), product success for the spine:

- An invite-provisioned org can complete the spine flow end-to-end in a staging environment  
- Client portal users cannot access another client’s projects (automated test)  
- Staff permissions can restrict who invites portal users and who sees financials (even if financials ship later, the permission model exists)  
- Auth supports magic link **and** password  
- Financial artefacts (when built) are **AUD only** initially

---

## 7. Branding and white-label (product intent only)

- Each org has **branding config** (name, logo asset ref, accent tokens later)  
- Future: custom domains and module entitlements  
- Phase 0: **no visual design, colours, or polished UI** — only hooks and data fields so UI work later is not blocked  

---

## 8. HyperLynx / Dispatch Sites relationship

- Tavelle is owned/built as a **HyperLynx product**; Dispatch Sites is a **business wing that uses it** as a branded org  
- Avoid encoding Dispatch Sites–only entities into core modules  
- DS look-and-feel comes from **org branding/config**  
- Future HyperLynx integrations (billing, site ops tools) are **integration boundaries**, not dependencies of Tavelle’s core — **none required before portal MVP**  

---

## 9. Locked product decisions (2026-11-26)

| Topic | Decision |
|-------|----------|
| Org provisioning (Phases 1–4) | Invite-only; no self-serve org signup |
| Auth methods (v1) | Magic link **and** password |
| Currency | AUD only to start |
| DS in core | Forbidden — branding/config only |

See [PHASE-0-SUMMARY.md](./PHASE-0-SUMMARY.md) for Phase 1 setup blockers (GitHub, Cloudflare account, domain timing).

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| Organisation (org) | Tenant boundary; the business account |
| Membership | User ↔ org link with roles |
| Client | Customer company/person the org serves |
| Portal user | External user invited for a client relationship |
| Module | Cohesive domain area with owned tables and API surface |
| Contract | Shared Zod/TypeScript types for request/response and domain events (in-process) |
