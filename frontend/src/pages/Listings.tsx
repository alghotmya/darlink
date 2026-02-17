import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBase } from '../lib/env';

interface Listing {
  listingId: string;
  title: string;
  type: string;
  price: number;
  currency: string;
  countryCode: string;
  city?: string;
  area?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  status: string;
}

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = getApiBase();
    const url = base ? `${base.replace(/\/$/, '')}/public/listings` : '/api/public/listings';
    fetch(url)
      .then((r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) {
          throw new Error(r.status === 404 ? 'API not found. Run the local API (see README) or set VITE_API_BASE_URL to your deployed API.' : `Request failed: ${r.status}`);
        }
        if (!ct.includes('application/json')) {
          throw new Error('API returned non-JSON. Set VITE_API_BASE_URL in frontend/.env or run: cd backend && node local-api-server.js');
        }
        return r.json();
      })
      .then((data) => {
        if (data?.listings) setListings(data.listings);
        else setListings([]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading listings…</p>;
  if (error) return <p style={{ color: 'crimson' }}>Error: {error}</p>;

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Listings</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {listings.length === 0 && <p>No listings yet. Deploy backend and run seed script.</p>}
        {listings.map((l) => (
          <Link
            key={l.listingId}
            to={`/listings/${l.listingId}`}
            style={{
              display: 'block',
              padding: '1rem',
              background: '#fff',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              color: 'inherit',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{l.title}</div>
            <div style={{ fontSize: '0.9rem', color: '#0d6efd' }}>
              {l.currency} {l.price?.toLocaleString()} — {l.type}
            </div>
            {(l.city || l.area) && (
              <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.25rem' }}>
                {[l.city, l.area].filter(Boolean).join(', ')}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
