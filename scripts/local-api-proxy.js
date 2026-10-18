const http = require('http');
const https = require('https');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const PORT = 8000;
const TARGET_HOST = 'ayaanclothing.com';

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || 'http://localhost:3000';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Length': '0',
    });
    return res.end();
  }

  const headers = { ...req.headers };
  headers.host = TARGET_HOST;
  if (headers['x-test-client-ip'] && !headers['x-internal-secret']) {
    headers['x-internal-secret'] = 'c0ce71ca5f5ba4f9fdb2e60b3deaa277b503e4d83ce5f217c10e20c3c4327513';
  }

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    family: 4,
    path: req.url,
    method: req.method,
    headers,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers };
    responseHeaders['access-control-allow-origin'] = origin;
    responseHeaders['access-control-allow-credentials'] = 'true';
    responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
    delete responseHeaders['x-frame-options'];

    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[API Proxy Error]', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Local API proxy failed', details: err.message }));
    }
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[API Proxy] Local API proxy listening on http://127.0.0.1:${PORT} -> https://${TARGET_HOST}`);
});
