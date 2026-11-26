import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { AcceptInviteSchema, InviteStaffSchema } from "@tavelle/contracts";
import type { AppVariables, Env } from "../../env.js";
import { requireSessionUser } from "../../middleware/session.js";
import {
  ACTIVE_ORG_COOKIE,
  requireTenant,
} from "../../middleware/tenant.js";
import { can } from "../permissions/can.js";
import { getDb } from "../orgs/service.js";
import { acceptStaffInvite, createStaffInvite } from "./service.js";
import { sendTransactionalEmail } from "../identity/email.js";

export const membershipRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

membershipRoutes.post("/invites", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const tenant = requireTenant(c);
  if (!tenant) return c.json({ error: "no_active_org" }, 400);

  if (!can(tenant.role, "member:invite")) {
    return c.json({ error: "forbidden" }, 403);
  }

  const parsed = InviteStaffSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const db = getDb(c.env);
  const invite = await createStaffInvite(db, {
    orgId: tenant.orgId,
    invitedByUserId: user.id,
    input: parsed.data,
  });

  const base =
    c.env.BETTER_AUTH_URL?.replace(/\/$/, "") ??
    new URL(c.req.url).origin;
  const acceptUrl = `${base}/accept-invite?token=${invite.rawToken}`;

  await sendTransactionalEmail(c.env, {
    to: parsed.data.email,
    subject: "You're invited to Tavelle",
    text: `You have been invited to join an organisation on Tavelle.\n\nAccept: ${acceptUrl}\n\nExpires: ${invite.expiresAt.toISOString()}\n`,
  });

  return c.json(
    {
      id: invite.id,
      email: parsed.data.email,
      role: parsed.data.role,
      expiresAt: invite.expiresAt.toISOString(),
      // Dev/staging convenience when email is stubbed — never a password/secret.
      acceptUrl,
    },
    201,
  );
});

membershipRoutes.post("/invites/accept", async (c) => {
  const user = requireSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const parsed = AcceptInviteSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_body" }, 400);
  }

  const db = getDb(c.env);
  const result = await acceptStaffInvite(db, {
    token: parsed.data.token,
    userId: user.id,
    userEmail: user.email,
  });

  if (!result.ok) {
    const status =
      result.error === "expired_invite"
        ? 410
        : result.error === "email_mismatch"
          ? 403
          : 400;
    return c.json({ error: result.error }, status);
  }

  setCookie(c, ACTIVE_ORG_COOKIE, result.orgId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: (c.env.ENVIRONMENT ?? "") !== "development",
    maxAge: 60 * 60 * 24 * 30,
  });

  return c.json({
    orgId: result.orgId,
    orgName: result.orgName,
    role: result.role,
  });
});
