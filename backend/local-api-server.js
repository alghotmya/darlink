/**
 * Local dev API server for frontend proxy when VITE_API_BASE_URL is not set.
 * Serves GET /public/listings and GET /public/listings/:id with mock or empty data.
 * Run: node local-api-server.js  (default port 3000)
 */
const http = require('http');

const PORT = Number(process.env.LOCAL_API_PORT) || 3000;

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const path = req.url?.split('?')[0] || '';
  const idMatch = path.match(/^\/public\/listings\/([^/]+)\/?$/);
  const listingId = idMatch ? idMatch[1] : null;

  if (path === '/public/listings' && req.method === 'GET') {
    json(res, 200, { listings: [], nextToken: null });
    return;
  }

  if (listingId && req.method === 'GET' && !path.endsWith('/leads')) {
    json(res, 404, { error: 'Listing not found' });
    return;
  }

  if (path.match(/^\/public\/listings\/[^/]+\/leads$/) && req.method === 'POST') {
    json(res, 202, { message: 'Lead received (local mock)' });
    return;
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`DarLink local API: http://localhost:${PORT} (use for Vite proxy when VITE_API_BASE_URL is unset)`);
});
