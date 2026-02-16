import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <section style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Find your place</h1>
        <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
          Rent and buy property across UAE, GCC and Egypt.
        </p>
        <Link
          to="/listings"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#0d6efd',
            color: '#fff',
            borderRadius: '6px',
            fontWeight: 600,
          }}
        >
          Browse listings
        </Link>
      </section>
      <section>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Regions</h2>
        <ul style={{ listStyle: 'none', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {['UAE', 'Saudi Arabia', 'Bahrain', 'Kuwait', 'Oman', 'Qatar', 'Egypt'].map((r) => (
            <li key={r}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: '#e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                {r}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
