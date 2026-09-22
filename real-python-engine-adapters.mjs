import { spawn } from "node:child_process";

function runPython(script, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn("python", [script], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${script} timed out`));
    }, 30000);

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      stdout = "";
      stderr = "";
      fn(value);
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 1024 * 1024) {
        child.kill();
        finish(reject, new Error(`${script} stdout exceeded 1MB`));
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 1024 * 1024) {
        child.kill();
        finish(reject, new Error(`${script} stderr exceeded 1MB`));
      }
    });

    child.on("error", (error) => finish(reject, error));

    child.on("close", (code) => {
      if (code !== 0) {
        finish(reject, new Error(stderr || `${script} exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.replace(/^\uFEFF/, ""));
        finish(resolve, parsed);
      } catch (error) {
        finish(reject, error);
      }
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

