import { Link } from 'react-router-dom';
import { useListings } from '../hooks/useListings';
import ListingCard from '../components/ListingCard';

export default function Home() {
  const { listings, loading, error } = useListings();

  return (
    <div>
      <section style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Find your place</h1>
        <p style={{ color: '#6c757d', marginBottom: '0.5rem' }}>
          Rent and buy property across UAE, GCC and Egypt.
        </p>
        <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
          Regions: UAE · Saudi Arabia · Bahrain · Kuwait · Oman · Qatar · Egypt
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Browse listings</h2>
        {loading && <p>Loading listings…</p>}
        {error && (
          <p style={{ color: 'crimson' }}>
            {error}{' '}
            <Link to="/listings">Try again</Link>
          </p>
        )}
        {!loading && !error && listings.length === 0 && (
          <p style={{ color: '#6c757d' }}>
            No listings yet. Admins can add properties from the <Link to="/admin">Admin</Link> page.
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
      </section>
    </div>
  );
}
