# OCR 재검증 데이터 계약

## 목적

기본 OCR이 실패하거나 불확실할 때 멀티모달 재검증 결과와 사람 확정 결과를 보존하고, 이후 로컬 모델 학습 데이터로 사용할 수 있도록 한다.

## 처리 단계

```text
원본 이미지 → 기본 OCR → 실패·불확실성 감지 → 로컬 멀티모달 재검증 → 사람 확정 → 학습 데이터 후보
```

## 재검증 레코드

```json
{
  "record_version": "1.0",
  "source": "ocr",
  "image_hash": "sha256:...",
  "item_type": "rare",
  "item_slot": "ring",
  "ocr_text": "화염 저항 +2G%",
  "failure_codes": ["OCR_VALUE_UNCERTAIN"],
  "multimodal_text": "화염 저항 +26%",
  "multimodal_status": "verified",
  "human_label": null,
  "label_source": null,
  "dataset_status": "pending"
}
```

## 실패 코드

- IMAGE_MISSING
- IMAGE_CORRUPT
- OCR_EMPTY
- OCR_LOW_CONFIDENCE
- OCR_OPTION_UNKNOWN
- OCR_VALUE_UNCERTAIN
- OPTION_DUPLICATE
- IMAGE_OCR_CONFLICT
- MULTIMODAL_UNAVAILABLE

## 멀티모달 상태

- `not_run`: 재검증을 실행하지 않음
- `verified`: 이미지와 OCR이 일치함
- `corrected`: 멀티모달 결과가 OCR을 수정함
- `conflict`: 이미지와 OCR이 충돌함
- `abstain`: 모델이 판단하지 않음
- `error`: 로컬 모델 실행 오류

## 학습 데이터 상태

- `pending`: 추가 검수 필요
- `human_verified`: 사람이 최종 정답을 확정함
- `train_candidate`: 학습 후보로 사용 가능
- `validation_only`: 검증셋 전용
- `rejected`: 오류·중복·충돌로 학습 제외

## 보호 원칙

- 기존 OCR 엔진은 직접 수정하지 않는다.
- 로컬 모델이 없으면 기존 감정 결과를 보존한다.
- 검증되지 않은 레코드는 자동 학습에 사용하지 않는다.
- 원본 이미지와 원본 OCR은 삭제하지 않는다.
