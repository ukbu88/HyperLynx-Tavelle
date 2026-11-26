import { and, eq, isNull } from "drizzle-orm";
import {
  invitations,
  memberships,
  organisations,
  type TavelleDb,
} from "@tavelle/db";
import type { InviteStaffInput } from "@tavelle/contracts";
import { newId, newToken } from "../../lib/ids.js";
import { sha256Hex } from "../../lib/hash.js";

const INVITE_TTL_MS = 1000 * 60 * 60 * 72; // 72h

export async function createStaffInvite(
  db: TavelleDb,
  opts: {
    orgId: string;
    invitedByUserId: string;
    input: InviteStaffInput;
  },
) {
  const rawToken = newToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const id = newId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

  await db.insert(invitations).values({
    id,
    orgId: opts.orgId,
    email: opts.input.email.toLowerCase(),
    kind: "staff",
    role: opts.input.role,
    tokenHash,
    invitedByUserId: opts.invitedByUserId,
    expiresAt,
    createdAt: now,
  });

  return { id, rawToken, expiresAt };
}

export async function acceptStaffInvite(
  db: TavelleDb,
  opts: { token: string; userId: string; userEmail: string },
) {
  const tokenHash = await sha256Hex(opts.token);
  const invite = await db
    .select()
    .from(invitations)
    .where(
      and(eq(invitations.tokenHash, tokenHash), isNull(invitations.acceptedAt)),
    )
    .get();

  if (!invite) {
    return { ok: false as const, error: "invalid_invite" };
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "expired_invite" };
  }
  if (invite.email.toLowerCase() !== opts.userEmail.toLowerCase()) {
    return { ok: false as const, error: "email_mismatch" };
  }
  if (invite.kind !== "staff") {
    return { ok: false as const, error: "invalid_kind" };
  }

  const existing = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.orgId, invite.orgId),
        eq(memberships.userId, opts.userId),
      ),
    )
    .get();

  if (!existing) {
    await db.insert(memberships).values({
      id: newId(),
      orgId: invite.orgId,
      userId: opts.userId,
      role: invite.role,
      status: "active",
      createdAt: new Date(),
    });
  }

  await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invite.id));

  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, invite.orgId))
    .get();

  return {
    ok: true as const,
    orgId: invite.orgId,
    orgName: org?.name ?? null,
    role: invite.role,
  };
}
