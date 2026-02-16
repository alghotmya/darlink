export default function Login() {
  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Login</h1>
      <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
        Cognito auth will be wired here. For now use the API directly.
      </p>
      <form>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>Password</label>
          <input
            type="password"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        <button
          type="button"
          disabled
          style={{
            padding: '0.5rem 1rem',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'not-allowed',
          }}
        >
          Sign in (coming soon)
        </button>
      </form>
    </div>
  );
}
