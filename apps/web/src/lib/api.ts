import type {
  ClientNote,
  Contact,
  Customer,
  MeResponse,
  WorkspaceNote,
} from "@tavelle/contracts";

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body.message ?? body.error ?? `HTTP ${res.status}`,
    };
  }
  return { ok: true, data: body as T };
}

export function fetchMe() {
  return api<MeResponse>("/api/me");
}

export function switchOrg(orgId: string) {
  return api<{ activeOrgId: string; role: string }>("/api/orgs/switch", {
    method: "POST",
    body: JSON.stringify({ orgId }),
  });
}

export function createOrg(input: {
  name: string;
  slug: string;
  displayName?: string;
}) {
  return api<{ orgId: string }>("/api/orgs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function inviteStaff(input: { email: string; role: string }) {
  return api<{
    id: string;
    email: string;
    role: string;
    acceptUrl: string;
    expiresAt: string;
  }>("/api/invites", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function acceptInvite(token: string) {
  return api<{ orgId: string; orgName: string | null; role: string }>(
    "/api/invites/accept",
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
  );
}

export function seedDemoOrgs() {
  return api<{ orgIds: string[]; count: number }>("/api/seed/demo-orgs", {
    method: "POST",
    body: "{}",
  });
}

export function listNotes() {
  return api<{ notes: WorkspaceNote[] }>("/api/notes");
}

export function createNote(body: string) {
  return api<WorkspaceNote>("/api/notes", {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function listCustomers() {
  return api<{ op: string; customers: Customer[] }>("/api/customers");
}

export function createCustomer(input: { name: string; status?: string }) {
  return api<{ op: string; customer: Customer }>("/api/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCustomer(
  id: string,
  input: { name?: string; status?: string },
) {
  return api<{ op: string; customer: Customer }>(`/api/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getCustomer(id: string) {
  return api<{ op: string; customer: Customer }>(`/api/customers/${id}`);
}

export function listContacts(customerId: string) {
  return api<{ op: string; contacts: Contact[] }>(
    `/api/customers/${customerId}/contacts`,
  );
}

export function createContact(input: {
  clientId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}) {
  return api<{ op: string; contact: Contact }>("/api/contacts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listClientNotes(customerId: string) {
  return api<{ op: string; notes: ClientNote[] }>(
    `/api/customers/${customerId}/notes`,
  );
}

export function createClientNote(input: { clientId: string; body: string }) {
  return api<{ op: string; note: ClientNote }>("/api/client-notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
