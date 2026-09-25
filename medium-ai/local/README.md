# Local Ollama gateway and tunnel

Run the gateway with a per-machine token; never commit the token or tunnel credentials.

PowerShell:

    $env:OLLAMA_GATEWAY_TOKEN = '<random-long-token>'
    node medium-ai/local/ollama-gateway.mjs

Run cloudflared tunnel run with a local copy of the config template. The tunnel
points to the authenticated gateway on 127.0.0.1:8788, never directly to
Ollama's unauthenticated port 11434.

The gateway does not write request bodies to disk and sets Cache-Control: no-store.
