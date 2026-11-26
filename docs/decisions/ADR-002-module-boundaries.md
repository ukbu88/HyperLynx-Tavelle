# ADR-002 — Module Boundaries

**Status:** ACCEPTED  
**Date proposed:** 2026-11-26  
**Date accepted:** 2026-11-26 (Australia/Brisbane)  
**Deciders:** Prince Ukaegbu  
**Related:** [MODULES.md](../MODULES.md), [preferences.md](../../preferences.md)

---

## Context

Tavelle must be modular enough for white-label entitlements and future HyperLynx integrations, without premature microservices or a plugin framework. Solo-founder velocity matters.

Tavelle is a **HyperLynx product** used first by the Dispatch Sites business wing. Dispatch Sites must **not** be hardcoded into app core; it appears through **org branding/config**.

---

## Decision (accepted)

1. Ship a **modular monolith** (one API Worker, one web app).  
2. Organise server code as **modules** with owned schemas, services, and routes.  
3. Enforce **dependency rules** (see MODULES.md) via conventions + lint boundaries (e.g. eslint `no-restricted-imports`) when the tree stabilises.  
4. Start with modules in `apps/api/src/modules/*`; extract packages only when needed.  
5. MVP modules: `identity`, `orgs`, `memberships`, `permissions`, `crm`, `projects`, `tasks`, `portal`, `activity`.  
6. Defer `sales`, `financials`, `documents`, `communications`, `services`, `integrations`, `entitlements` until the roadmap reaches them.  
7. **No** in-process event bus for MVP; use direct service calls + `activity.record`.  
8. HyperLynx / Dispatch Sites systems integrate only through `integrations` later; **core does not import them** and must not encode DS-specific entities.  
9. Org branding/config is how Dispatch Sites (or any tenant) appears in the product.

### Acceptance notes (Prince, 2026-11-26)

- Product identity: Tavelle = HyperLynx product; Dispatch Sites = branded tenant / business wing usage, not core schema  
- No mandatory HyperLynx system integration before portal MVP  

---

## Why necessary

- Prevents a Dispatch Sites–specific ball of mud  
- Makes permission and tenancy audits tractable  
- Allows entitlements to toggle modules later  
- Keeps AI-assisted changes localized  

---

## Alternatives considered

| Alternative | Why rejected / deferred |
|-------------|-------------------------|
| Microservice per module | Ops overhead, distributed transactions, solo-founder tax |
| Plugin runtime / dynamic module loader | Overengineering for unknown third-party modules |
| Layer-only architecture without domain modules | Scales poorly across CRM + portal + financials |
| Separate portal service | Premature split; shared auth/tenancy would duplicate |
| Hexagonal ports/adapters everywhere | Ceremony cost; apply selectively around auth and storage |
| Hardcode Dispatch Sites domain into core | Forces rewrite for white-label / other HyperLynx uses | Rejected |

---

## Trade-offs

- Conventions can erode without lint — mitigate with `no-restricted-imports` and code review checklist  
- Some duplication of “get project for org” helpers until shared read APIs exist — acceptable  
- Keep `tasks` separate from `projects` unless complexity stays trivial  

---

## Deferrable / reversible?

- Merging `tasks` → `projects`: easy early, harder after rich task features  
- Extracting a module to its own Worker: possible later if CPU/isolation demands  
- Introducing domain events: additive  

---

## Consequences

- Roadmap phases map to module enablement  
- ADR-003 tenancy applies uniformly across modules  
- Testing strategy includes module-level permission tests  
- Code review rejects Dispatch Sites–named tables/routes in core modules  
