import { Link } from 'react-router-dom';
import { useListings } from '../hooks/useListings';
import ListingCard from '../components/ListingCard';

export default function Listings() {
  const { listings, loading, error } = useListings();

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>All listings</h1>
      {loading && <p>Loading listings…</p>}
      {error && (
        <p style={{ color: 'crimson' }}>
          {error}
        </p>
      )}
      {!loading && !error && listings.length === 0 && (
        <p style={{ color: '#6c757d' }}>
          No listings yet. <Link to="/admin">Admin</Link> can add properties.
        </p>
      )}
      {!loading && !error && listings.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {listings.map((l) => (
            <ListingCard key={l.listingId} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
