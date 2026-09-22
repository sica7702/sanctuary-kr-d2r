import { createRealPythonEngineAdapters } from "./real-python-engine-adapters.mjs";
import { createMcdaEngine } from "./mcda-engine.mjs";
import { runVerificationPipeline } from "./verification-pipeline.mjs";`r`nimport { cleanupRuntimeCaches } from "./cache-cleanup.mjs";

const connectedAdapters = {
  ...createRealPythonEngineAdapters(),
  mcda: createMcdaEngine(),
};

export async function runConnectedVerificationPipeline(verificationPayload) {`r`n  await cleanupRuntimeCaches();
  return runVerificationPipeline(
    verificationPayload,
    connectedAdapters,
  );
}

