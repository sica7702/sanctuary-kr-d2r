import { verificationToAlgorithmInput } from "./verification-adapter.mjs";
import { runAlgorithmPipeline } from "./algorithm-orchestrator.mjs";

export async function runVerificationPipeline(
  verificationPayload,
  runners = {},
) {
  const algorithmInput =
    verificationToAlgorithmInput(verificationPayload);

  return runAlgorithmPipeline(algorithmInput, runners);
}
