import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, Navigate } from "react-router-dom";
import type {
  ClientNote,
  Contact,
  Customer,
  MeResponse,
  WorkspaceNote,
} from "@tavelle/contracts";
import { AppHeader } from "../shell/AppHeader";
import { authClient } from "../lib/auth-client";
import {
  createClientNote,
  createContact,
  createCustomer,
  createNote,
  createOrg,
  fetchMe,
  inviteStaff,
  listClientNotes,
  listContacts,
  listCustomers,
  listNotes,
  seedDemoOrgs,
  seedHyperlynx,
  switchBusiness,
  switchOrg,
  updateCustomer,
} from "../lib/api";

export function WorkspacePage() {
  const { data: session, isPending } = authClient.useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [editName, setEditName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPrimary, setContactPrimary] = useState(false);
  const [clientNoteBody, setClientNoteBody] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumps so superseded detail responses are ignored. */
  const detailGenerationRef = useRef(0);
  /** Synced immediately on select (not only after re-render). */
  const selectedCustomerIdRef = useRef<string | null>(null);

  const clearCustomerDetails = useCallback(() => {
    detailGenerationRef.current += 1;
    setContacts([]);
    setClientNotes([]);
  }, []);

  const selectCustomerId = useCallback(
    (customerId: string | null) => {
      selectedCustomerIdRef.current = customerId;
      setSelectedCustomerId(customerId);
    },
    [],
  );

  const refreshCustomerDetail = useCallback(async (customerId: string) => {
    const generation = ++detailGenerationRef.current;
    const [contactsRes, notesRes] = await Promise.all([
      listContacts(customerId),
      listClientNotes(customerId),
    ]);
    // Ignore stale responses (another customer selection superseded this one).
    if (generation !== detailGenerationRef.current) return;
    if (selectedCustomerIdRef.current !== customerId) return;
    if (contactsRes.ok) setContacts(contactsRes.data.contacts);
    if (notesRes.ok) setClientNotes(notesRes.data.notes);
  }, []);

  const refresh = useCallback(
    async (preferCustomerId?: string | null) => {
      const meRes = await fetchMe();
      if (!meRes.ok) {
        setError(meRes.error);
        return;
      }
      setMe(meRes.data);
      if (meRes.data.activeOrgId && meRes.data.activeBusinessId) {
        const [notesRes, customersRes] = await Promise.all([
          listNotes(),
          listCustomers(),
        ]);
        if (notesRes.ok) setNotes(notesRes.data.notes);
        if (customersRes.ok) {
          setCustomers(customersRes.data.customers);
          const wantId = preferCustomerId ?? selectedCustomerIdRef.current;
          const stillSelected = wantId
            ? customersRes.data.customers.find((c) => c.id === wantId)
            : undefined;
          if (stillSelected) {
            selectCustomerId(stillSelected.id);
            setEditName(stillSelected.name);
            await refreshCustomerDetail(stillSelected.id);
          } else {
            selectCustomerId(null);
            clearCustomerDetails();
            setEditName("");
          }
        } else if (customersRes.status === 400) {
          setCustomers([]);
          selectCustomerId(null);
          clearCustomerDetails();
        }
      } else {
        setNotes([]);
        setCustomers([]);
        selectCustomerId(null);
        clearCustomerDetails();
        setEditName("");
      }
    },
    [clearCustomerDetails, refreshCustomerDetail, selectCustomerId],
  );

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

  async function onSwitchOrg(orgId: string) {
    setError(null);
    const res = await switchOrg(orgId);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(`Active org → ${orgId}`);
    selectCustomerId(null);
    clearCustomerDetails();
    setEditName("");
    await refresh();
  }

  async function onSwitchBusiness(businessId: string) {
    setError(null);
    const res = await switchBusiness(businessId);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(`Active business → ${res.data.business.name}`);
    selectCustomerId(null);
    clearCustomerDetails();
    setEditName("");
    setCustomers([]);
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

  async function onCreateCustomer(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await createCustomer({ name: customerName });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCustomerName("");
    setStatus(`customers.create → ${res.data.customer.name}`);
    await refresh(res.data.customer.id);
  }

  async function onSelectCustomer(customer: Customer) {
    selectCustomerId(customer.id);
    setEditName(customer.name);
    setError(null);
    // Clear previous customer's panel immediately so stale rows never linger.
    clearCustomerDetails();
    await refreshCustomerDetail(customer.id);
  }

  async function onUpdateCustomer(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setError(null);
    const res = await updateCustomer(selectedCustomerId, { name: editName });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(`customers.update → ${res.data.customer.name}`);
    await refresh();
  }

  async function onCreateContact(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setError(null);
    const res = await createContact({
      clientId: selectedCustomerId,
      name: contactName,
      email: contactEmail || null,
      isPrimary: contactPrimary,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setContactName("");
    setContactEmail("");
    setContactPrimary(false);
    setStatus(`contacts.create → ${res.data.contact.name}`);
    await refreshCustomerDetail(selectedCustomerId);
  }

  async function onCreateClientNote(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setError(null);
    const res = await createClientNote({
      clientId: selectedCustomerId,
      body: clientNoteBody,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setClientNoteBody("");
    setStatus(`clientNotes.create`);
    await refreshCustomerDetail(selectedCustomerId);
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
    const bizNames =
      res.data.hyperlynx?.businesses.map((b) => b.name).join(" + ") ??
      "businesses";
    setStatus(`Seeded HyperLynx (${bizNames}) + demo tenant`);
    await refresh();
  }

  async function onSeedHyperlynx() {
    setError(null);
    const res = await seedHyperlynx();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(res.data.message);
    await refresh();
  }

  const selected = customers.find((c) => c.id === selectedCustomerId) ?? null;
  const activeBusiness =
    me?.businesses.find((b) => b.id === me.activeBusinessId) ?? null;

  return (
    <>
      <AppHeader email={session.user.email} />
      <main className="shell">
        <header className="shell__intro">
          <p className="shell__eyebrow">Workspace</p>
          <h1 className="shell__title">Customers</h1>
          <p className="shell__tagline">
            Domain ops (<code>customers.*</code> / <code>contacts.*</code>) run
            through TenantContext — org + active business, not UI-only logic.
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
              {me.isPlatformAdmin
                ? " or seed HyperLynx below."
                : "."}
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
                    onClick={() => void onSwitchOrg(m.orgId)}
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
          <section className="workspace-section">
            <h2>Business workspace</h2>
            <p className="auth-message">
              Switch with <code>businesses.setActive</code> — lists never mix
              across Dispatch Sites and NexRail.
            </p>
            {me.businesses.length === 0 ? (
              <p className="auth-message">
                No businesses in this org yet.
                {me.isPlatformAdmin
                  ? " Seed HyperLynx to create Dispatch Sites + NexRail."
                  : ""}
              </p>
            ) : (
              <div className="business-switcher" role="group" aria-label="Business workspace">
                {me.businesses.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={
                      me.activeBusinessId === b.id
                        ? "business-chip business-chip--active"
                        : "business-chip"
                    }
                    onClick={() => void onSwitchBusiness(b.id)}
                    aria-pressed={me.activeBusinessId === b.id}
                  >
                    <span className="business-chip__name">{b.name}</span>
                    <span className="business-chip__meta">{b.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {me?.activeOrgId && me.activeBusinessId && (
          <>
            <section className="workspace-section">
              <h2>
                Customers
                {activeBusiness ? ` · ${activeBusiness.name}` : ""}
              </h2>
              <p className="auth-message">
                Explicit ops: customers.create / list / get / update — scoped to
                the active business.
              </p>
              <form
                className="auth-form auth-form--inline"
                onSubmit={(e) => void onCreateCustomer(e)}
              >
                <label className="auth-field">
                  <span>Name</span>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </label>
                <button type="submit" className="auth-btn auth-btn--primary">
                  Create customer
                </button>
              </form>
              {customers.length === 0 ? (
                <p className="empty-state">
                  No customers in {activeBusiness?.name ?? "this business"} yet.
                  Create one to start the relationship record.
                </p>
              ) : (
                <ul className="note-list">
                  {customers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={
                          selectedCustomerId === c.id
                            ? "org-chip org-chip--active"
                            : "org-chip"
                        }
                        onClick={() => void onSelectCustomer(c)}
                      >
                        <span className="org-chip__name">{c.name}</span>
                        <span className="org-chip__meta">{c.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {selected && (
              <section className="workspace-section">
                <h2>Customer detail</h2>
                <form
                  className="auth-form auth-form--inline"
                  onSubmit={(e) => void onUpdateCustomer(e)}
                >
                  <label className="auth-field">
                    <span>Name</span>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </label>
                  <button type="submit" className="auth-btn auth-btn--primary">
                    Update
                  </button>
                </form>

                <h3 className="workspace-subhead">Contacts</h3>
                <form
                  className="auth-form"
                  onSubmit={(e) => void onCreateContact(e)}
                >
                  <label className="auth-field">
                    <span>Name</span>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </label>
                  <label className="auth-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </label>
                  <label className="auth-check">
                    <input
                      type="checkbox"
                      checked={contactPrimary}
                      onChange={(e) => setContactPrimary(e.target.checked)}
                    />
                    <span>Primary contact</span>
                  </label>
                  <button type="submit" className="auth-btn auth-btn--primary">
                    Add contact
                  </button>
                </form>
                <ul className="note-list">
                  {contacts.map((ct) => (
                    <li key={ct.id}>
                      <span>
                        {ct.name}
                        {ct.email ? ` · ${ct.email}` : ""}
                      </span>
                      <span className="org-chip__meta">
                        {ct.isPrimary ? "primary" : "contact"}
                      </span>
                    </li>
                  ))}
                </ul>

                <h3 className="workspace-subhead">Client notes</h3>
                <form
                  className="auth-form auth-form--inline"
                  onSubmit={(e) => void onCreateClientNote(e)}
                >
                  <label className="auth-field">
                    <span>Note</span>
                    <input
                      type="text"
                      required
                      value={clientNoteBody}
                      onChange={(e) => setClientNoteBody(e.target.value)}
                    />
                  </label>
                  <button type="submit" className="auth-btn auth-btn--primary">
                    Add note
                  </button>
                </form>
                <ul className="note-list">
                  {clientNotes.map((n) => (
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
            )}

            <section className="workspace-section">
              <h2>Invite staff</h2>
              <form
                className="auth-form auth-form--inline"
                onSubmit={(e) => void onInvite(e)}
              >
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
                Org-scoped tenancy proof (not CRM client notes).
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
              Invite-only org provisioning — seed HyperLynx for Dispatch Sites +
              NexRail workspaces.
            </p>
            <div className="auth-cta">
              <button
                type="button"
                className="auth-btn auth-btn--primary"
                onClick={() => void onSeedHyperlynx()}
              >
                Seed HyperLynx businesses
              </button>
              <button
                type="button"
                className="auth-btn auth-btn--ghost"
                onClick={() => void onSeed()}
              >
                Seed HyperLynx + demo tenant
              </button>
            </div>
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
          </section>
        )}
      </main>
    </>
  );
}
