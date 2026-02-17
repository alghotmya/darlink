import { getApiBase } from './env';

const base = () => (getApiBase() ? getApiBase().replace(/\/$/, '') : '');

function adminHeaders(): HeadersInit {
  const key = import.meta.env.VITE_ADMIN_API_KEY as string | undefined;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (key) headers['x-admin-key'] = key;
  return headers;
}

export async function adminListListings(orgId: string) {
  const res = await fetch(`${base()}/orgs/${orgId}/listings`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function adminGetListing(orgId: string, listingId: string) {
  const res = await fetch(`${base()}/orgs/${orgId}/listings/${listingId}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function adminCreateListing(orgId: string, body: Record<string, unknown>) {
  const res = await fetch(`${base()}/orgs/${orgId}/listings`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function adminUpdateListing(orgId: string, listingId: string, body: Record<string, unknown>) {
  const res = await fetch(`${base()}/orgs/${orgId}/listings/${listingId}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function adminGetPresign(orgId: string, listingId: string, fileName: string, contentType: string) {
  const res = await fetch(`${base()}/orgs/${orgId}/listings/${listingId}/media/presign`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ fileName, contentType }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}
