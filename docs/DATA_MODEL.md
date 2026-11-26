# Tavelle — Data Model (Phase 0)

**Status:** Phase 0 decisions locked (2026-11-26, Australia/Brisbane)  
**Related:** [MODULES.md](./MODULES.md), [ADR-003-tenant-isolation.md](./decisions/ADR-003-tenant-isolation.md) (ACCEPTED)

---

## 1. Principles

- **Org-scoped rows** carry `org_id` (UUID). Queries always constrain by server-resolved tenant.  
- **Users are global**; access is via `memberships` (staff) or `portal_memberships` (clients).  
- Prefer **soft delete** (`deleted_at`) for CRM entities; hard delete for ephemeral tokens.  
- **Money** stored as integer minor units + `currency` (ISO 4217); do not use floats. **v1 accepts AUD only** (locked 2026-11-26).  
- **IDs:** UUID v7 (time-sortable) preferred; UUID v4 acceptable if tooling is simpler.  
- **Timestamps:** `created_at` / `updated_at` in UTC; display in Australia/Brisbane in UI later.  
- **No frontend-only tenancy:** `org_id` on writes comes from session context, not trusted body fields.  
- **Invite-only ops:** schema still multi-tenant; public self-serve org creation is out of Phases 1–4.

---

## 2. ERD (MVP + near-term)

```mermaid
erDiagram
  users ||--o{ memberships : has
  organisations ||--o{ memberships : has
  organisations ||--o{ clients : owns
  clients ||--o{ contacts : has
  clients ||--o{ projects : has
  projects ||--o{ tasks : has
  projects ||--o{ milestones : has
  organisations ||--o{ activity_events : logs
  users ||--o{ activity_events : actor
  clients ||--o{ portal_memberships : grants
  users ||--o{ portal_memberships : is
  organisations ||--o{ invitations : issues
  organisations ||--o{ role_bindings : configures
  organisations ||--|| org_branding : has

  users {
    uuid id PK
    string email UK
    string name
    string password_hash nullable
    datetime email_verified_at nullable
    datetime created_at
  }

  organisations {
    uuid id PK
    string name
    string slug UK
    string status
    datetime created_at
  }

  memberships {
    uuid id PK
    uuid org_id FK
    uuid user_id FK
    string role
    string status
    datetime created_at
  }

  clients {
    uuid id PK
    uuid org_id FK
    string name
    string status
    datetime deleted_at nullable
  }

  contacts {
    uuid id PK
    uuid org_id FK
    uuid client_id FK
    string name
    string email nullable
    string phone nullable
    boolean is_primary
  }

  projects {
    uuid id PK
    uuid org_id FK
    uuid client_id FK
    string name
    string status
    text summary nullable
    datetime deleted_at nullable
  }

  milestones {
    uuid id PK
    uuid org_id FK
    uuid project_id FK
    string name
    date due_on nullable
    string status
  }

  tasks {
    uuid id PK
    uuid org_id FK
    uuid project_id FK
    string title
    string status
    uuid assignee_user_id nullable
    datetime due_at nullable
  }

  portal_memberships {
    uuid id PK
    uuid org_id FK
    uuid client_id FK
    uuid user_id FK
    string status
  }

  invitations {
    uuid id PK
    uuid org_id FK
    string email
    string kind
    uuid client_id nullable
    string token_hash
    datetime expires_at
    datetime accepted_at nullable
  }

  activity_events {
    uuid id PK
    uuid org_id FK
    uuid actor_user_id nullable
    string action
    string entity_type
    uuid entity_id
    json metadata
    datetime created_at
  }

  org_branding {
    uuid org_id PK
    string display_name nullable
    string logo_object_key nullable
    json theme_tokens nullable
  }
```

---

## 3. Near-term entities (post-MVP)

Introduce when modules ship; keep FKs org-scoped:

| Entity | Module | Notes |
|--------|--------|-------|
| `leads` / `opportunities` | sales | May convert → `client` + `project` |
| `proposals` / `proposal_line_items` | sales | Versioned PDF optional later |
| `invoices` / `invoice_line_items` / `payments` | financials | Integer money; **AUD only** for v1 |
| `documents` | documents | R2 key + checksum + visibility |
| `threads` / `messages` | communications | Portal + staff |
| `service_agreements` / `service_periods` | services | Recurring |

---

## 4. Tenant isolation in the schema

- Every org-owned table includes `org_id NOT NULL` + index `(org_id, …)`  
- Composite uniqueness where needed, e.g. `(org_id, slug)` only if slugs are per-tenant; **platform slug** on `organisations` is global  
- Portal queries join `portal_memberships` and filter `client_id`  
- Prefer Drizzle query helpers that **require** `orgId` parameter (TypeScript enforcement)

**Not in v1:** separate D1 database per tenant (see ADR-003). Shared DB + row isolation is enough until noisy-neighbour or compliance forces otherwise.

---

## 5. Auth-related tables

Depends on chosen auth library (see ADR-001). Conceptually required:

- `sessions` (token hash, user_id, expires)  
- `verification_tokens` / magic-link tokens  
- Password credentials as required by Better Auth  
- Optional: `accounts` / OAuth later  

Map library tables carefully so `users.id` remains the FK target for memberships.

---

## 6. Indexes (initial)

- `memberships (user_id)`, `memberships (org_id, user_id)` unique  
- `clients (org_id)`, `projects (org_id, client_id)`, `tasks (org_id, project_id)`  
- `portal_memberships (org_id, user_id)`, unique `(org_id, client_id, user_id)`  
- `invitations (token_hash)` unique  
- `activity_events (org_id, created_at)`  

---

## 7. Data portability

- Migrations via Drizzle Kit; SQL artefacts in repo  
- Per-org export (JSON or SQL dump of org-scoped rows) planned as a **Phase 6+** admin action; schema designed so export is mechanical  
- Documents in R2 prefixed `org/{org_id}/…`

---

## 8. Decisions and trade-offs

| Decision | Why | Alternative | Reversible? |
|----------|-----|-------------|-------------|
| Shared D1 + `org_id` | Simple, cheap, fine for early tenants | DB-per-tenant | Yes, with export tooling |
| Soft delete CRM entities | Safer ops / portal consistency | Hard delete only | Yes |
| Integer money + AUD-only v1 | Avoid float bugs; locked currency | Multi-currency day one | Keep `currency` column; reject non-AUD until needed |
| Activity as append-only | Audit + feed without coupling | Dual-write to many tables | Yes |
| Collapse leads into clients early? | **No** — keep sales optional | Single “party” table | Prefer separate when sales ships |

### Deferrable

- Full-text search tables  
- Event sourcing  
- Separate read replicas  
- `external_refs` link table until an integration needs it  
