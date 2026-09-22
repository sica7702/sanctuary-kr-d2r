import { spawn } from "node:child_process";

function runPythonModel(modelName, features) {
  return new Promise((resolve, reject) => {
    const child = spawn("python", ["python-model-bridge.py"]);
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
        reject(new Error(stderr || `Python bridge exited with code ${code}`));
        return;
      }

      resolve(JSON.parse(stdout));
    });

    child.stdin.end(JSON.stringify({
      model: modelName,
      features,
    }));
  });
}

export function createPythonModelAdapters() {
  return Object.fromEntries(
    [
      "xgboost",
      "regression",
      "gpr",
      "dbscan",
      "genetic",
      "bayesian",
    ].map((modelName) => [
      modelName,
      async (input) => runPythonModel(modelName, input.features),
    ]),
  );
}
