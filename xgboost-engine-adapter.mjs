import { spawn } from "node:child_process";

export function createXGBoostEngineAdapter() {
  return async (input) =>
    new Promise((resolve, reject) => {
      const child = spawn("python", ["xgboost_engine.py"]);
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
          reject(new Error(stderr || `XGBoost engine exited with code ${code}`));
          return;
        }

        resolve(JSON.parse(stdout.replace(/^\uFEFF/, "")));
      });

      child.stdin.end(JSON.stringify({
        features: input.features,
      }));
    });
}
