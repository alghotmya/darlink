import { useState } from 'react';
import {
  adminListListings,
  adminGetListing,
  adminCreateListing,
  adminUpdateListing,
  adminGetPresign,
} from '../lib/api';

const DEFAULT_ORG = 'org-seed-001';
const CURRENCIES = ['AED', 'USD', 'SAR', 'EGP'];
const COUNTRIES = [
  { code: 'AE', label: 'UAE' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'BH', label: 'Bahrain' },
  { code: 'KW', label: 'Kuwait' },
  { code: 'OM', label: 'Oman' },
  { code: 'QA', label: 'Qatar' },
  { code: 'EG', label: 'Egypt' },
];

export default function Admin() {
  const [orgId, setOrgId] = useState(DEFAULT_ORG);
  const [listings, setListings] = useState<Array<{ listingId: string; title: string; status: string }>>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '' as number | '',
    currency: 'AED',
    countryCode: 'AE',
    type: 'rent' as 'rent' | 'sale',
    city: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    areaSqm: '',
    status: 'draft' as 'draft' | 'published',
    mediaKeys: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadListings = async () => {
    setLoadingList(true);
    setMessage(null);
    try {
      const data = await adminListListings(orgId);
      setListings(data.listings || []);
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to load' });
    } finally {
      setLoadingList(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        title: form.title,
        description: form.description || undefined,
        price: Number(form.price),
        currency: form.currency,
        countryCode: form.countryCode,
        type: form.type,
        status: form.status,
        city: form.city || undefined,
        area: form.area || undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
        mediaKeys: form.mediaKeys,
      };
      if (editingId) {
        await adminUpdateListing(orgId, editingId, body);
        setMessage({ type: 'ok', text: 'Listing updated.' });
        setEditingId(null);
      } else {
        await adminCreateListing(orgId, body);
        setMessage({ type: 'ok', text: 'Listing created. Add photos below or publish from the list.' });
      }
      setForm({ ...form, title: '', description: '', price: '', mediaKeys: [] });
      loadListings();
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (listingId: string, file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const { uploadUrl, key } = await adminGetPresign(orgId, listingId, file.name, file.type);
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const list = await adminListListings(orgId);
      const listing = (list.listings || []).find((l: { listingId: string }) => l.listingId === listingId);
      const mediaKeys = [...(listing?.mediaKeys || []), key];
      await adminUpdateListing(orgId, listingId, { ...listing, mediaKeys });
      setMessage({ type: 'ok', text: 'Photo uploaded.' });
      loadListings();
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const styleSection = {
    marginBottom: '1.5rem',
    padding: '1.25rem',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  };
  const styleInput = {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ced4da',
  } as const;

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Admin — Upload property information</h1>
      <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
        Create and edit listings. Property info appears on the <a href="/">landing page</a> for visitors to browse.
      </p>

      {message && (
        <p style={{ color: message.type === 'err' ? 'crimson' : 'green', marginBottom: '1rem' }}>
          {message.text}
        </p>
      )}

      <section style={styleSection}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Organization</h2>
        <input
          type="text"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="orgId"
          style={{ ...styleInput, maxWidth: '240px', marginRight: '0.5rem' }}
        />
        <button
          type="button"
          onClick={loadListings}
          disabled={loadingList}
          style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #0d6efd', background: '#0d6efd', color: '#fff', cursor: 'pointer' }}
        >
          {loadingList ? 'Loading…' : 'Load my listings'}
        </button>
      </section>

      <section style={styleSection}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
          {editingId ? 'Edit listing' : 'Create new listing'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={styleInput}
                placeholder="e.g. Modern 2BR in Dubai Marina"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Price *</label>
              <input
                type="number"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : '' })}
                style={styleInput}
                placeholder="120000"
              />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              style={styleInput}
              placeholder="Property description…"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                style={styleInput}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Country</label>
              <select
                value={form.countryCode}
                onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                style={styleInput}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'rent' | 'sale' })}
                style={styleInput}
              >
                <option value="rent">Rent</option>
                <option value="sale">Sale</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
                style={styleInput}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={styleInput} placeholder="Dubai" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Area</label>
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} style={styleInput} placeholder="Dubai Marina" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Beds</label>
                <input type="number" min={0} value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} style={styleInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Baths</label>
                <input type="number" min={0} value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} style={styleInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>m²</label>
                <input type="number" min={0} value={form.areaSqm} onChange={(e) => setForm({ ...form, areaSqm: e.target.value })} style={styleInput} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#0d6efd', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              {saving ? 'Saving…' : editingId ? 'Update listing' : 'Create listing'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm({ ...form, title: '', description: '', price: '', mediaKeys: [] }); }}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #6c757d', background: '#fff', cursor: 'pointer' }}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      {listings.length > 0 && (
        <section style={styleSection}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Your listings</h2>
          <ul style={{ listStyle: 'none' }}>
            {listings.map((l) => (
              <li
                key={l.listingId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid #eee',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span><strong>{l.title}</strong> — {l.status}</span>
                <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const listing = await adminGetListing(orgId, l.listingId);
                        setEditingId(l.listingId);
                        setForm({
                          title: listing.title || '',
                          description: listing.description || '',
                          price: listing.price ?? '',
                          currency: listing.currency || 'AED',
                          countryCode: listing.countryCode || 'AE',
                          type: (listing.type === 'sale' ? 'sale' : 'rent') as 'rent' | 'sale',
                          city: listing.city || '',
                          area: listing.area || '',
                          bedrooms: listing.bedrooms?.toString() ?? '',
                          bathrooms: listing.bathrooms?.toString() ?? '',
                          areaSqm: listing.areaSqm?.toString() ?? '',
                          status: (listing.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
                          mediaKeys: listing.mediaKeys || [],
                        });
                      } catch (e) {
                        setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to load listing' });
                      }
                    }}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #0d6efd', background: '#fff', color: '#0d6efd', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <label style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                    Add photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(l.listingId, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
