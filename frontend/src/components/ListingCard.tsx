import { Link } from 'react-router-dom';
import type { Listing } from '../types/listing';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link
      to={`/listings/${listing.listingId}`}
      style={{
        display: 'block',
        padding: 0,
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        color: 'inherit',
        overflow: 'hidden',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          aspectRatio: '16/10',
          background: '#e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          color: '#6c757d',
        }}
      >
        {listing.mediaKeys?.length ? '📷' : 'No image'}
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{listing.title}</div>
        <div style={{ fontSize: '0.9rem', color: '#0d6efd' }}>
          {listing.currency} {listing.price?.toLocaleString()} — {listing.type}
        </div>
        {(listing.city || listing.area) && (
          <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.25rem' }}>
            {[listing.city, listing.area].filter(Boolean).join(', ')}
          </div>
        )}
      </div>
    </Link>
  );
}
