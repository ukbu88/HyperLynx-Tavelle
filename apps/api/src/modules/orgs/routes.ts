import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import {
  CreateOrganisationSchema,
  MeResponseSchema,
  SwitchOrgSchema,
} from "@tavelle/contracts";
import type { AppVariables, Env } from "../../env.js";
import { requireSessionUser } from "../../middleware/session.js";
import { ACTIVE_ORG_COOKIE } from "../../middleware/tenant.js";
import { isPlatformAdmin } from "./platform.js";
import {
  getDb,
  getMembership,
  listMembershipsForUser,
  provisionOrganisation,
} from "./service.js";

export const orgRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

orgRoutes.get("/me", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const db = getDb(c.env);
  const memberships = await listMembershipsForUser(db, user.id);
  const tenant = c.get("tenant");

  const body = MeResponseSchema.parse({
    user: { id: user.id, email: user.email, name: user.name },
    memberships,
    activeOrgId: tenant?.orgId ?? null,
    isPlatformAdmin: isPlatformAdmin(c.env, user.email, user.emailVerified),
  });

  return c.json(body);
});

orgRoutes.post("/orgs", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  if (!isPlatformAdmin(c.env, user.email, user.emailVerified)) {
    return c.json(
      {
        error: "forbidden",
        message: user.emailVerified
          ? "Organisation creation is invite-only. Platform admins provision orgs."
          : "Verify your email (e.g. magic link) before using platform-admin actions.",
      },
      403,
    );
  }

  const parsed = CreateOrganisationSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env);
  try {
    const { orgId } = await provisionOrganisation(db, parsed.data, user.id);
    setCookie(c, ACTIVE_ORG_COOKIE, orgId, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      secure: (c.env.ENVIRONMENT ?? "") !== "development",
      maxAge: 60 * 60 * 24 * 30,
    });
    return c.json({ orgId }, 201);
  } catch (err) {
    console.error("org_provision_failed", c.get("requestId"), err);
    return c.json({ error: "provision_failed" }, 500);
  }
});

orgRoutes.post("/orgs/switch", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const parsed = SwitchOrgSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body" }, 400);
  }

  // Reject forged org IDs — membership must exist.
  const db = getDb(c.env);
  const membership = await getMembership(db, user.id, parsed.data.orgId);
  if (!membership) {
    return c.json({ error: "forbidden", message: "Not a member of that org" }, 403);
  }

  setCookie(c, ACTIVE_ORG_COOKIE, parsed.data.orgId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: (c.env.ENVIRONMENT ?? "") !== "development",
    maxAge: 60 * 60 * 24 * 30,
  });

  return c.json({ activeOrgId: parsed.data.orgId, role: membership.role });
});
