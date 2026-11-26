# Tavelle — Security Baseline (Phase 0)

**Status:** Phase 0 decisions locked (2026-11-26, Australia/Brisbane)  
**Audience:** Architecture + pre-production checklist  

---

## 1. Threat context

Tavelle will hold **real customer PII**, commercial documents, and eventually payment artefacts. Early orgs are invite-provisioned (e.g. Dispatch Sites business wing as a branded tenant), but **security posture must assume external client portal users** from the moment portal ships.

Trust boundaries:

- Browser (untrusted)  
- SPA (untrusted for authorization)  
- API Worker (trusted for AuthZ decisions)  
- D1 / R2 (trusted stores; protect credentials and keys)  
- Email provider (semi-trusted; tokens must be single-use and hashed)

---

## 2. AuthN requirements

| Control | MVP requirement |
|---------|-----------------|
| Library | Better Auth (ACCEPTED spike); abstract behind `identity` |
| Methods (v1) | **Magic link and password** |
| Session storage | Server-side session or signed opaque token; prefer store in D1 |
| Cookies | `HttpOnly`, `Secure` (prod), `SameSite` set deliberately |
| Passwords | Modern KDF (Argon2id or scrypt via auth library); never roll own |
| Invites | Opaque token, **hashed at rest**, expiry, single-use |
| Org signup | **Invite-only** for Phases 1–4 — no public self-serve org creation |
| MFA | **Not required for MVP**; plan hook before high-value financials |
| OAuth | Deferred |
| Logout | Invalidate server session |

---

## 3. AuthZ requirements

- **RBAC** for staff roles (`owner`, `admin`, `member`, `viewer`)  
- **Portal isolation:** every portal query constrained by `org_id` **and** `client_id` from `TenantContext`  
- Deny by default; grant via role permissions  
- IDOR defence: load resource by id **and** tenant scope; 404 on mismatch (do not leak existence across tenants)  
- Active org selection validated against membership on every request  

**Frontend never decides authorization.** UI may hide buttons; API must enforce.

---

## 4. Multi-tenancy isolation

See [ADR-003](./decisions/ADR-003-tenant-isolation.md).

Must-haves before real data:

1. Central tenant middleware — no “forgot org_id” queries  
2. Automated tests for cross-tenant and cross-client access attempts  
3. Audit of Drizzle helpers to require `orgId`  
4. R2 keys prefixed by `org_id`; download paths authorize metadata row first  

---

## 5. Data protection

| Area | Baseline |
|------|----------|
| In transit | HTTPS only (Cloudflare) |
| At rest | Cloudflare platform encryption; app-level field encryption **deferred** except secrets |
| Secrets | Worker secrets / `.dev.vars`; never commit |
| Backups | D1 backup strategy before production CRM data (export or CF backup features) |
| PII minimisation | Collect only what workflows need |
| Logs | No passwords, tokens, or full card data in logs; redact emails if shipping to third-party log drains |

---

## 6. Application security checklist

### Required before **any** real customer data

- [ ] Security headers: `CSP` (start strict, tighten), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`  
- [ ] CSRF strategy: same-site cookies + custom header for mutations **or** double-submit; document choice at implement time  
- [ ] Rate limit auth and invite endpoints (Cloudflare WAF / rate limiting rules)  
- [ ] Input validation via Zod on all write endpoints  
- [ ] File upload: type/size allowlist; do not serve user content from privileged origin without content disposition controls  
- [ ] Dependency scanning in CI (npm audit / OSV)  
- [ ] Error responses: generic 500s to clients; detail only in server logs  
- [ ] Cross-tenant / portal isolation test suite green  

### Required before **documents** module in production

- [ ] Malware scanning path or gated upload + manual review for internal-only  
- [ ] Signed download URLs with short TTL  

### Required before **financials** with real money movement

- [ ] MFA for `owner` / payout-sensitive actions  
- [ ] Immutable invoice numbering per org  
- [ ] Separation of duties for payment recording (policy)  
- [ ] PCI: **do not** store card PAN; use a payment provider hosted fields if taking cards  

### Required before **multi-tenant public self-serve signup** (deferred past Phases 1–4)

- [ ] Abuse controls on org creation  
- [ ] Email verification enforced  
- [ ] Terms / privacy acceptance records  
- [ ] Entitlements + fair-use limits  

Invite-only provisioning does **not** waive cross-tenant isolation tests.  

---

## 7. Communications and email security

- Magic links: short TTL (e.g. 30–60 minutes), single-use, hashed tokens  
- Prefer transactional email provider with DMARC on sending domain  
- Portal message content treated as user-generated: escape on render, store raw carefully  

---

## 8. Operational security (solo founder)

- GitHub: branch protection on `main`, required checks when CI exists  
- Cloudflare: least-privilege API tokens for deploy  
- Separate Cloudflare accounts or at least separate D1 DBs for `dev` / `staging` / `prod`  
- Break-glass: documented recovery for lost owner access (out-of-band)  

---

## 9. AI-assisted development risks

- Do not paste production secrets into AI chats  
- Review generated auth/tenant code carefully — common failure mode is trusting client `orgId`  
- Prefer tests over trusting “looks right” permission filters  

---

## 10. Incident readiness (lightweight)

Even as a solo founder, before portal goes live:

- Contact path for security reports (`security@` or form)  
- Ability to revoke sessions globally per user  
- Ability to disable a portal membership quickly  

---

## 11. Decisions

| Decision | Why | Alternative | Defer? |
|----------|-----|-------------|--------|
| Better Auth + magic link **and** password | Locked 2026-11-26 | Magic-link only; paid auth SaaS | Spike fallback only if Better Auth fails |
| Invite-only org provisioning (Phases 1–4) | Early internal/ops use; reduce abuse | Public self-serve signup | Yes — until productisation |
| API enforces all AuthZ | SPA cannot be trusted | BFF-only checks | No |
| Hashed invite tokens | DB leak resistance | Store raw tokens | No |
| MFA deferred | Speed to spine MVP | MFA day one | Yes until financials / public SaaS |
| App-level encryption deferred | Platform encryption + complexity cost | Envelope encryption | Yes until compliance demands |

**Still open (implementation detail, not product direction):** CSRF pattern with chosen cookie setup; whether staging uses production-like WAF rules from day one (recommended: yes for portal testing).
