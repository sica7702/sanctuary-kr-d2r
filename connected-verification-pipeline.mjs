import { createRealPythonEngineAdapters } from "./real-python-engine-adapters.mjs";
import { createMcdaEngine } from "./mcda-engine.mjs";
import { runVerificationPipeline } from "./verification-pipeline.mjs";

const connectedAdapters = {
  ...createRealPythonEngineAdapters(),
  mcda: createMcdaEngine(),
};

export function runConnectedVerificationPipeline(verificationPayload) {
  return runVerificationPipeline(
    verificationPayload,
    connectedAdapters,
  );
}
