import { createRealPythonEngineAdapters } from "./real-python-engine-adapters.mjs";
import { createMcdaEngine } from "./mcda-engine.mjs";
import { runVerificationPipeline } from "./verification-pipeline.mjs";
import { cleanupRuntimeCaches } from "./cache-cleanup.mjs";

const connectedAdapters = {
  ...createRealPythonEngineAdapters(),
  mcda: createMcdaEngine(),
};

export async function runConnectedVerificationPipeline(verificationPayload) {
  await cleanupRuntimeCaches();

  return runVerificationPipeline(
    verificationPayload,
    connectedAdapters,
  );
}
