import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import type { MeResponse, WorkspaceNote } from "@tavelle/contracts";
import { AppHeader } from "../shell/AppHeader";
import { authClient } from "../lib/auth-client";
import {
  createNote,
  createOrg,
  fetchMe,
  inviteStaff,
  listNotes,
  seedDemoOrgs,
  switchOrg,
} from "../lib/api";

export function WorkspacePage() {
  const { data: session, isPending } = authClient.useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const meRes = await fetchMe();
    if (!meRes.ok) {
      setError(meRes.error);
      return;
    }
    setMe(meRes.data);
    if (meRes.data.activeOrgId) {
      const notesRes = await listNotes();
      if (notesRes.ok) setNotes(notesRes.data.notes);
    } else {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    if (session?.user) void refresh();
  }, [session?.user, refresh]);

  if (isPending) {
    return (
      <>
        <AppHeader />
        <main className="shell">
          <p className="shell__loading">Loading session…</p>
        </main>
      </>
    );
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" replace />;
  }

  async function onSwitch(orgId: string) {
    setError(null);
    const res = await switchOrg(orgId);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(`Active org → ${orgId}`);
    await refresh();
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteUrl(null);
    const res = await inviteStaff({ email: inviteEmail, role: "member" });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setInviteUrl(res.data.acceptUrl);
    setStatus(`Invite created for ${res.data.email}`);
    setInviteEmail("");
  }

  async function onCreateNote(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await createNote(noteBody);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNoteBody("");
    await refresh();
  }

  async function onProvision(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await createOrg({
      name: orgName,
      slug: orgSlug,
      displayName: orgName,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(`Provisioned org ${res.data.orgId}`);
    setOrgName("");
    setOrgSlug("");
    await refresh();
  }

  async function onSeed() {
    setError(null);
    const res = await seedDemoOrgs();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(`Seeded ${res.data.count} demo orgs`);
    await refresh();
  }

  return (
    <>
      <AppHeader email={session.user.email} />
      <main className="shell">
        <header className="shell__intro">
          <p className="shell__eyebrow">Workspace</p>
          <h1 className="shell__title">Identity &amp; tenancy</h1>
          <p className="shell__tagline">
            Active org is server-verified from your membership cookie — forged
            org IDs are rejected.
          </p>
        </header>

        {error && <p className="shell__error">{error}</p>}
        {status && <p className="auth-message">{status}</p>}

        <section className="workspace-section">
          <h2>Organisations</h2>
          {me && me.memberships.length === 0 && (
            <p className="auth-message">
              No memberships yet. Accept an{" "}
              <Link to="/accept-invite">invite</Link>
              {me.isPlatformAdmin ? " or provision / seed orgs below." : "."}
            </p>
          )}
          {me && me.memberships.length > 0 && (
            <ul className="org-list">
              {me.memberships.map((m) => (
                <li key={m.orgId}>
                  <button
                    type="button"
                    className={
                      me.activeOrgId === m.orgId
                        ? "org-chip org-chip--active"
                        : "org-chip"
                    }
                    onClick={() => void onSwitch(m.orgId)}
                  >
                    <span className="org-chip__name">
                      {m.displayName ?? m.orgName}
                    </span>
                    <span className="org-chip__meta">
                      {m.role}
                      {me.activeOrgId === m.orgId ? " · active" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {me?.activeOrgId && (
          <>
            <section className="workspace-section">
              <h2>Invite staff</h2>
              <form className="auth-form auth-form--inline" onSubmit={(e) => void onInvite(e)}>
                <label className="auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </label>
                <button type="submit" className="auth-btn auth-btn--primary">
                  Send invite
                </button>
              </form>
              {inviteUrl && (
                <p className="auth-message">
                  Invite URL (also logged when email is stubbed):{" "}
                  <a href={inviteUrl}>{inviteUrl}</a>
                </p>
              )}
            </section>

            <section className="workspace-section">
              <h2>Workspace notes</h2>
              <p className="auth-message">
                Org-scoped CRUD proving TenantContext isolation.
              </p>
              <form
                className="auth-form auth-form--inline"
                onSubmit={(e) => void onCreateNote(e)}
              >
                <label className="auth-field">
                  <span>Note</span>
                  <input
                    type="text"
                    required
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                  />
                </label>
                <button type="submit" className="auth-btn auth-btn--primary">
                  Add note
                </button>
              </form>
              <ul className="note-list">
                {notes.map((n) => (
                  <li key={n.id}>
                    <span>{n.body}</span>
                    <time dateTime={n.createdAt}>
                      {new Date(n.createdAt).toLocaleString("en-AU", {
                        timeZone: "Australia/Brisbane",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {me?.isPlatformAdmin && (
          <section className="workspace-section">
            <h2>Platform admin</h2>
            <p className="auth-message">
              Invite-only org provisioning — not public self-serve signup.
            </p>
            <form className="auth-form" onSubmit={(e) => void onProvision(e)}>
              <label className="auth-field">
                <span>Name</span>
                <input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </label>
              <label className="auth-field">
                <span>Slug</span>
                <input
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                />
              </label>
              <button type="submit" className="auth-btn auth-btn--primary">
                Provision organisation
              </button>
            </form>
            <button
              type="button"
              className="auth-btn auth-btn--ghost"
              onClick={() => void onSeed()}
            >
              Seed two demo orgs
            </button>
          </section>
        )}
      </main>
    </>
  );
}
