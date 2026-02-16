import { useState } from 'react';
import { getApiBase } from '../lib/env';

export default function LeadForm({ listingId }: { listingId: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    const base = getApiBase();
    const url = base ? `${base}/public/listings/${listingId}/leads` : `/api/public/listings/${listingId}/leads`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || res.statusText);
        setStatus('error');
        return;
      }
      setStatus('done');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Request failed');
      setStatus('error');
    }
  };

  return (
    <section style={{ maxWidth: '400px', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Contact about this listing</h2>
      {status === 'done' && <p style={{ color: 'green', marginBottom: '1rem' }}>Message sent. We’ll get back to you.</p>}
      {status === 'error' && <p style={{ color: 'crimson', marginBottom: '1rem' }}>{errorMsg}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'sending'}
          style={{
            padding: '0.5rem 1rem',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: status === 'sending' ? 'wait' : 'pointer',
          }}
        >
          {status === 'sending' ? 'Sending…' : 'Send inquiry'}
        </button>
      </form>
    </section>
  );
}
