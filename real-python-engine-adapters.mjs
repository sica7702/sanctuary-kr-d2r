import { spawn } from "node:child_process";

function runPython(script, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn("python", [script]);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `${script} exited with code ${code}`));
        return;
      }

      resolve(JSON.parse(stdout.replace(/^\uFEFF/, "")));
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

export function createRealPythonEngineAdapters() {
  return {
    xgboost: (input) =>
      runPython("xgboost_engine.py", {
        features: input.features,
      }),

    regression: (input) =>
      runPython("ridge_engine.py", {
        features: input.features,
      }),

    gpr: (input) =>
      runPython("gpr_engine.py", {
        features: input.features,
      }),

    dbscan: (input) =>
      runPython("dbscan_engine.py", {
        features: input.features,
      }),

    genetic: (input) =>
      runPython("genetic_engine.py", {
        features: input.features,
      }),

    bayesian: (input) =>
      runPython("bayesian_engine.py", {
        features: input.features,
      }),

    apriori: (input) =>
      runPython("apriori_engine.py", {
        transactions: input.marketContext?.transactions ?? [],
      }),

    collaborative: (input) =>
      runPython("collaborative_engine.py", {
        userId: input.marketContext?.userId,
        ratings: input.marketContext?.ratings ?? {},
      }),
  };
}
