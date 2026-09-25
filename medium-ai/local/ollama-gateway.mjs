import http from 'node:http';

const listenPort = Number(process.env.OLLAMA_GATEWAY_PORT || 8788);
const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const gatewayToken = process.env.OLLAMA_GATEWAY_TOKEN;
const maxBodyBytes = 5 * 1024 * 1024;

if (!gatewayToken) throw new Error('OLLAMA_GATEWAY_TOKEN is required');

const server = http.createServer(async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (req.headers['x-ollama-gateway-token'] !== gatewayToken) {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
    return;
  }
  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'not_found' }));
    return;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      res.writeHead(413, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'request_too_large' }));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  }
  const upstream = await fetch(ollamaUrl + '/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: Buffer.concat(chunks),
  });
  res.writeHead(upstream.status, { 'content-type': 'application/json' });
  res.end(Buffer.from(await upstream.arrayBuffer()));
});

server.listen(listenPort, '127.0.0.1', () => console.log('ollama-gateway listening on 127.0.0.1:' + listenPort));
