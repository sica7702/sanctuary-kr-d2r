import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON_MODELS = [
  "xgboost",
  "regression",
  "gpr",
  "dbscan",
  "genetic",
  "bayesian",
];

export function createPythonModelAdapters() {
  return Object.fromEntries(
    PYTHON_MODELS.map((modelName) => [
      modelName,
      async (input) => {
        const request = JSON.stringify({
          model: modelName,
          features: input.features,
        });

        const { stdout } = await execFileAsync(
          "python",
          ["python-model-bridge.py"],
          { input: request },
        );

        return JSON.parse(stdout);
      },
    ]),
  );
}
