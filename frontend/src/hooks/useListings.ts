import { useEffect, useState } from 'react';
import { getApiBase } from '../lib/env';
import type { Listing } from '../types/listing';

export function useListings() {
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
          throw new Error(
            r.status === 404
              ? 'API not found. Run the local API or set VITE_API_BASE_URL.'
              : `Request failed: ${r.status}`
          );
        }
        if (!ct.includes('application/json')) {
          throw new Error('API returned non-JSON. Set VITE_API_BASE_URL in frontend/.env.');
        }
        return r.json();
      })
      .then((data) => {
        setListings(data?.listings ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { listings, loading, error };
}
