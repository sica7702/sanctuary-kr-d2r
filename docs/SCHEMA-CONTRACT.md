# 공통 데이터 스키마 계약

## 목적

OCR 감정, 수동 감정, AI 보조 판정, 최종 출력이 같은 필드명과 자료형을 사용하도록 한다.

## 입력 필수 필드

- schema_version
- source
- item_type
- item_slot
- class
- ladder
- mode
- required_level
- stats
- unresolved_options
- errors

## 옵션 필드

- stat_id
- value
- unit
- source_text
- confidence
- status

허용되는 status 값은 resolved, uncertain, duplicate, conflict, unsupported 이다.

## 판정 결과 필드

- schema_version
- value_grade
- review_action
- confidence
- reasons
- applied_options
- ignored_options
- abstain_reason
- model_version
- algorithm_version

## 공통 규칙

- 모든 결과에 schema_version을 포함한다.
- 같은 의미의 필드는 같은 이름을 사용한다.
- 숫자 값은 숫자 자료형으로 저장한다.
- 알 수 없는 옵션은 삭제하지 않고 errors 또는 unresolved_options에 남긴다.
- 중복 옵션은 자동 합산하지 않는다.
- 충돌 옵션은 자동 판정하지 않는다.
- AI 결과는 기존 감정 결과를 대체하지 않는다.
- 스키마 오류는 조용히 무시하지 않는다.

## 버전

현재 계약 버전은 1.0이다.
필드 변경이나 삭제가 필요하면 새 schema_version을 만든다.
