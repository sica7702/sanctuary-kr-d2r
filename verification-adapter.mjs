import { createAlgorithmInput } from "./algorithm-contract.mjs";

export function verificationToAlgorithmInput(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("검증 결과가 필요합니다.");
  }

  if (!payload.itemId) {
    throw new Error("검증 결과에 itemId가 필요합니다.");
  }

  if (!Array.isArray(payload.features)) {
    throw new Error("검증 결과에 features 배열이 필요합니다.");
  }

  return createAlgorithmInput({
    itemId: payload.itemId,
    features: payload.features,
    ocrVerified:
      payload.ocrVerified === true &&
      payload.multimodalVerified === true &&
      payload.matches !== false,
    marketContext: payload.marketContext ?? {},
  });
}
