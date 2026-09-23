import http from "node:http";
import { runConnectedVerificationPipeline } from "./connected-verification-pipeline.mjs";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/verify") {
    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
    return;
  }

  try {
    let body = "";
    for await (const chunk of req) body += chunk;

    const payload = JSON.parse(body);
    const result = await runConnectedVerificationPipeline(payload);

    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, result }));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({
      ok: false,
      error: String(error?.message || error),
    }));
  }
});

server.listen(8787, "127.0.0.1", () => {
  console.log("Real engine API ready on http://127.0.0.1:8787");
});
