/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');

const PORT = 3001;
const TARGET_PORT = 3000;

const server = http.createServer((req, res) => {
  const headers = { ...req.headers };
  // Ensure host header includes :3001 for proxy.ts admin detection
  if (!headers.host || !headers.host.includes(':3001')) {
    headers.host = `localhost:${PORT}`;
  }

  const options = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc;">
          <h2>Admin Gateway Starting...</h2>
          <p>Waiting for Next.js dev server on port ${TARGET_PORT}. Please wait a few seconds and refresh.</p>
        </body>
      </html>
    `);
  });

  req.pipe(proxyReq, { end: true });
});

// Support HMR / WebSocket upgrade for Next.js dev Fast Refresh
server.on('upgrade', (req, socket, head) => {
  const headers = { ...req.headers };
  if (!headers.host || !headers.host.includes(':3001')) {
    headers.host = `localhost:${PORT}`;
  }

  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers,
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      Object.entries(proxyRes.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    socket.destroy();
  });

  proxyReq.end();
});

server.listen(PORT, () => {
  console.log(`[Admin Proxy] Dedicated Admin Website listening on http://localhost:${PORT}`);
  console.log(`[Admin Proxy] Forwarding requests with admin host to http://localhost:${TARGET_PORT}`);
});
