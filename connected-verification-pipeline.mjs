import { createJavaScriptModelAdapters } from "./javascript-model-adapters.mjs";
import { createPythonModelAdapters } from "./python-model-adapters.mjs";
import { runVerificationPipeline } from "./verification-pipeline.mjs";

const connectedAdapters = {
  ...createPythonModelAdapters(),
  ...createJavaScriptModelAdapters(),
};

export function runConnectedVerificationPipeline(
  verificationPayload,
) {
  return runVerificationPipeline(
    verificationPayload,
    connectedAdapters,
  );
}
