/**
 * API base URL from env. Vite exposes env via import.meta.env.
 * For local dev without backend: use empty and proxy /api in vite.config.
 */
export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE_URL as string) || '';
}
