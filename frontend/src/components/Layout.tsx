import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header
        style={{
          padding: '1rem 1.5rem',
          background: '#fff',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a' }}>
          DarLink
        </Link>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          <Link to="/">Home</Link>
          <Link to="/listings">Listings</Link>
          <Link to="/admin">Admin</Link>
          <Link to="/login">Login</Link>
        </nav>
      </header>
      <main style={{ flex: 1, padding: '1.5rem' }}>
        <Outlet />
      </main>
      <footer
        style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #dee2e6',
          background: '#fff',
          fontSize: '0.875rem',
          color: '#6c757d',
        }}
      >
        DarLink — UAE, GCC & Egypt. Phase 1 MVP.
      </footer>
    </div>
  );
}
