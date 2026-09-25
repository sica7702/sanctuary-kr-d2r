# Media store contract v1

현재 운영 Worker에는 멀티모달 전용 R2 binding이 없으므로 이 계약은 준비 단계다. `ASSETS`는 배포 정적 파일용이며 크롤링 이미지 저장소로 사용하지 않는다.

## 저장 규칙

- 객체 키는 `medium-ai/candidates/{candidate_id}/{kind}/{sha256}.{ext}`
- 원본 바이트는 덮어쓰지 않는다.
- SHA-256이 동일하면 동일 객체로 취급한다.
- storage가 없으면 업로드하지 않고 `human_review`로 보류한다.
- 실제 R2 bucket과 Worker binding을 추가하기 전에는 운영 경로에서 import하지 않는다.

## 다음 연결 조건

- 별도 R2 bucket 생성
- `wrangler` 확장 브랜치 환경에만 binding 추가
- 이미지 보존·삭제 정책 확정
- MIME/크기 제한과 악성 파일 검사 추가
- fake adapter와 실제 R2 adapter 결과 비교
