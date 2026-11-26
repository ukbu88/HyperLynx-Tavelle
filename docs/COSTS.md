# Tavelle — Infrastructure Cost Estimate (Phase 0)

**Status:** Phase 0 decisions locked (2026-11-26, Australia/Brisbane)  
**Assumption date:** 2026-11-26  
**Deploy target:** Cloudflare Workers + D1 + R2 (**confirmed**)  
**Disclaimer:** Cloudflare and SaaS list prices change; treat as order-of-magnitude for initial usage, not a quote. Currency product decision: **AUD only** for v1 financials (infra vendors still bill in USD).

---

## 1. Usage profile (initial)

Estimate for **Phases 1–5** with invite-provisioned orgs (Dispatch Sites business wing as a branded tenant) + a few staging orgs:

| Resource | Assumed monthly usage |
|----------|----------------------|
| Active staff users | 5–20 |
| Portal users | 20–100 |
| API requests | &lt; 2M Workers requests |
| D1 storage | &lt; 1 GB |
| R2 storage | &lt; 20 GB documents |
| R2 Class A/B ops | Low (thousands–tens of thousands) |
| Transactional email | &lt; 3k messages |

This sits comfortably in Cloudflare’s free/low paid tiers for many accounts.

---

## 2. Cloudflare (preferred)

| Service | Role | Rough cost at initial usage |
|---------|------|-----------------------------|
| Workers | API | Often **$0** on free tier; Workers Paid ~**USD $5**/mo minimum if needed for limits |
| Workers KV | Optional sessions/flags | Usually avoid initially (use D1 sessions) |
| D1 | Primary DB | Free tier generous for MVP; paid storage/rows inexpensive at &lt;1 GB |
| R2 | Documents | Storage ~**USD $0.015**/GB-mo; no egress to CF Workers typical pattern — tens of cents–few dollars |
| Pages / static assets | SPA | Free tier usually enough |
| WAF / rate limit | Auth abuse controls | Depends on plan; start with included features |

**Ballpark Cloudflare subtotal (initial):** **USD $0–15 / month**.

---

## 3. Adjacent services

| Service | Role | Rough cost |
|---------|------|------------|
| GitHub | Repo + Actions | Free for private small team; Actions minutes usually fine |
| Domain + DNS | `tavelle…` | ~**AUD $15–40 / year** (registrar dependent) |
| Transactional email (Resend/Postmark) | Invites, magic links | Free tier often covers &lt;3k; then ~**USD $10–20**/mo |
| Error tracking (optional Sentry) | API errors | Free tier → **USD $0–26**/mo |
| Local tools | — | $0 |

**Avoid early spend:** Clerk/Auth0, Neon/PlanetScale (if staying on D1), Redis, Kubernetes, Datadog full stack, separate CMS.

---

## 4. Scenario totals (order of magnitude)

| Scenario | Monthly (USD) | Notes |
|----------|---------------|-------|
| Solo build (local + free CF) | **~$0** | No email vendor yet |
| Staging + light prod (internal tenant) | **~$5–25** | Workers paid optional + email |
| Early multi-tenant beta (hundreds of users) | **~$25–80** | Email + R2 growth + error tracking |
| Scale warning | **$100+** | Usually email volume, R2, Workers invocations — revisit architecture only with metrics |

All figures exclude founder labour and AI coding subscriptions.

---

## 5. Cost risks & levers

| Risk | Lever |
|------|-------|
| Email volume from noisy invites | Rate limit + batch; pick provider with clear free tier |
| Large document storage | Retention policies; compress PDFs; lifecycle deletes |
| Unexpected Workers CPU on PDF gen | Defer PDF; generate async later |
| Paid auth SaaS creep | Stick to self-hosted auth library on D1 |
| Multi-env sprawl | One staging + one prod only until needed |

---

## 6. Comparison escape hatch

If D1/Workers limits become painful:

- **Postgres on a small managed instance** (e.g. ~USD $5–30/mo) + Node host — higher ops, familiar SQL  
- Still cheaper than premature microservices  

Decision to leave Cloudflare should be **metric-triggered**, not aesthetic.

---

## 7. Recommendation

Budget **USD $0** to develop Phase 1–3 locally; plan **USD ~10–30/mo** when staging/prod + transactional email exist. Revisit this doc when the first paying external tenant or custom domains appear.
