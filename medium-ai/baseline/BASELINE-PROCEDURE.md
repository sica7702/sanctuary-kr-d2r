# Existing-system baseline v1

This baseline is read-only. It records hashes and byte sizes of production files before any medium-AI integration. It does not deploy, write D1, change a candidate, or alter the existing Worker.

Run from the project directory:

```powershell
node .\medium-ai\baseline\capture-baseline.mjs
```

The resulting `baseline-manifest.json` is a comparison reference. Runtime accuracy, latency, and memory measurements are intentionally separate and remain incomplete until a fixed benchmark set is available.
