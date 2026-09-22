import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = 8000;
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const MODEL = 'qwen2.5vl:3b';

function sendJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(body));
}

function parseModelJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = String(content).match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/verify') {
    sendJson(response, 404, { error: 'NOT_FOUND' });
    return;
  }

  try {
    let raw = '';
    for await (const chunk of request) raw += chunk;

    const input = JSON.parse(raw);
    const image = String(input.image ?? '');
    const ocrResult = input.ocrResult ?? null;

    if (!image || !ocrResult) {
      sendJson(response, 400, { error: 'IMAGE_OR_OCR_MISSING' });
      return;
    }

    const imageBase64 = image.replace(/^data:[^;]+;base64,/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.log('Ollama timeout');
      controller.abort();
    }, 120000);

    console.log('Ollama vision request started');

    const ollamaResponse = await fetch(OLLAMA_URL, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: 'json',
        messages: [{
          role: 'user',
          content: [
            '디아블로2 아이템 이미지를 판독하고 기존 OCR과 비교하라.',
            '반드시 JSON만 반환하라.',
            '형식: {"matches":true|false,"result":{"text":"최종 판독 문자열"}}',
            `기존 OCR 결과: ${JSON.stringify(ocrResult)}`
          ].join('\n'),
          images: [imageBase64]
        }]
      })
    });

    if (!ollamaResponse.ok) {
      const detail = await ollamaResponse.text();
      sendJson(response, ollamaResponse.status, {
        error: `OLLAMA_HTTP_${ollamaResponse.status}`,
        detail
      });
      return;
    }

    const payload = await ollamaResponse.json();
    const parsed = parseModelJson(payload?.message?.content ?? '');

    if (!parsed || typeof parsed.matches !== 'boolean') {
      sendJson(response, 502, { error: 'INVALID_MODEL_RESPONSE' });
      return;
    }

    sendJson(response, 200, {
      matches: parsed.matches,
      result: parsed.result ?? null
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Local multimodal bridge ready on http://${HOST}:${PORT}/verify`);
});


