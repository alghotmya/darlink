import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getApiBase } from '../lib/env';
import LeadForm from '../components/LeadForm';
import type { Listing } from '../types/listing';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const base = getApiBase();
    const url = base ? `${base.replace(/\/$/, '')}/public/listings/${id}` : `/api/public/listings/${id}`;
    fetch(url)
      .then((r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) return Promise.reject(new Error(r.status === 404 ? 'Listing not found' : `Request failed: ${r.status}`));
        if (!ct.includes('application/json')) return Promise.reject(new Error('API returned non-JSON'));
        return r.json();
      })
      .then(setListing)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (error || !listing) return <p style={{ color: 'crimson' }}>Listing not found.</p>;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>{listing.title}</h1>
      <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
        {listing.currency} {listing.price?.toLocaleString()} — {listing.type}
      </p>
      {(listing.city || listing.area) && (
        <p style={{ marginBottom: '1rem' }}>{[listing.city, listing.area].filter(Boolean).join(', ')}</p>
      )}
      {listing.description && <p style={{ marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>{listing.description}</p>}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {listing.bedrooms != null && <span>Bedrooms: {listing.bedrooms}</span>}
        {listing.bathrooms != null && <span>Bathrooms: {listing.bathrooms}</span>}
        {listing.areaSqm != null && <span>Area: {listing.areaSqm} m²</span>}
      </div>
      <LeadForm listingId={listing.listingId} />
    </div>
  );
}
