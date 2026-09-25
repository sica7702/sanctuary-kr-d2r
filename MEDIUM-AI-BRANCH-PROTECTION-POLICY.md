# Medium AI 브랜치 보호 정책

대상 브랜치: `medium-ai-body-scaffold`

## 필수 보호 설정

- 직접 push 금지
- Pull Request를 통한 병합만 허용
- 병합 전 승인 1명 이상
- 병합 전 필수 검증 통과
- force-push 및 브랜치 삭제 금지
- 운영 브랜치와 중형 AI 확장 브랜치의 변경 범위 분리

## 필수 검증 항목

- `medium-ai/baseline/run-baseline-benchmark.mjs`
- `node --test medium-ai/tests/*.test.mjs`
- 기존 운영 Worker 문법 검사
- D1 마이그레이션 또는 운영 데이터 변경 여부 확인

## 적용 원칙

이 문서는 보호 설정의 기준이며, GitHub 저장소 설정 반영 전까지는 정책 초안 상태입니다. 실제 보호 규칙은 인증된 GitHub 연결을 통해 별도로 적용하고 확인합니다.
