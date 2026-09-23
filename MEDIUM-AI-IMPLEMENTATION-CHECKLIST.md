# 중형 AI 확장 구현 체크리스트

> 기준 브랜치: `medium-ai-body-scaffold`  
> 표기: `[x]` 구현·검증 완료 · `[~]` 일부 준비/검증 중 · `[ ]` 미구현  
> 원칙: 기존 운영 Worker·D1·관리자 검수 흐름은 확장 작업에서 직접 변경하지 않는다.

## 1. 기존 시스템 보호

- [x] 확장 전용 브랜치 `medium-ai-body-scaffold` 생성
- [x] 기존 운영 코드와 분리된 `medium-ai/` 폴더 트리 생성
- [x] 기존 운영 Worker·DB에 확장 모듈을 import하지 않음
- [x] 단계별 커밋 생성
- [~] 기존 운영 기준 성능의 고정 benchmark 생성
- [ ] 운영 브랜치 보호 규칙/PR 승인 절차 등록

## 2. 공통 모델 계약

- [x] 중형 AI 입력 스키마
- [x] 중형 AI 출력 스키마
- [x] 모델 버전·데이터셋 버전·원본 스냅샷 해시 필드
- [x] shadow 모드에서 결과 적용 차단

## 3. 데이터셋 관리

- [x] dataset record 스키마
- [x] dataset manifest 스키마
- [x] human/weak/quarantine 라벨 상태 구분
- [x] train/validation/test/holdout 분리 계약
- [x] human_verified만 기본 파인튜닝 대상이 되도록 선별 함수
- [ ] 실제 수동 검수 데이터 manifest 생성·고정
- [ ] 데이터 누수·중복 자동 검사

## 4. 멀티모달 데이터 파이프라인

- [x] 이미지/OCR/원본 텍스트 asset 스키마
- [x] 후보 ID와 media asset 연결 계약
- [x] SHA-256 추적 필드
- [x] 텍스트·이미지 불일치 리포트 스키마
- [x] 부위·아이템 종류·출처 불일치 high severity 정책
- [ ] 실제 이미지 저장소 연결
- [ ] 실제 OCR 엔진 연결

## 5. 모델 버전·롤백

- [x] 모델 lifecycle: draft → shadow → candidate → active
- [x] 모델·파서·프롬프트·데이터셋 버전 기록
- [x] rollback record 스키마
- [x] 이전 모델 포인터 유지 정책
- [x] 삭제 없는 복구 정책
- [ ] 실제 `ai_models`와 확장 registry 연결

## 6. 불확실성·독립 평가

- [x] 신뢰도 임계값 정책
- [x] 원본 없음/파서 불완전/신규 옵션 보류
- [x] 텍스트·이미지 불일치 시 사람 검수 전환
- [x] holdout 평가 리포트 스키마
- [x] 정확도·false approval·누락·불일치·보류율 지표
- [x] holdout 최소 표본·승격 기준
- [ ] 실제 사람 검수 holdout 세트 구성

## 7. 파인튜닝 준비

- [x] SFT/LoRA/QLoRA 작업 스키마
- [x] adapter record 스키마
- [x] weak label 자동 제외 정책
- [x] 파인튜닝 작업 상태 관리
- [ ] 실제 학습 서버/GPU 연결
- [ ] 첫 human-reviewed 파인튜닝 작업 실행

## 8. 모델 어댑터·라우팅

- [x] 소형/중형/멀티모달/파인튜닝 adapter 스키마
- [x] 텍스트·복합 작업·이미지별 라우팅 정책
- [x] 호환 모델이 없으면 사람 검수로 전환
- [x] 현재 shadow-only 라우팅
- [ ] 실제 중형 모델 provider adapter 연결

## 9. 확장 구조 테스트

- [x] 계약 테스트
- [x] 데이터셋 선별 테스트
- [x] 멀티모달 불일치 테스트
- [x] 불확실성 보류 테스트
- [x] 모델 승격·롤백 테스트
- [x] 전체 테스트 7개 통과

## 10. Shadow runtime

- [x] 후보 → 입력 계약 → adapter → mismatch → uncertainty 흐름 연결
- [x] provider 없는 경우 human review 전환
- [x] 결과 `applied: false` 보장
- [x] D1/status/learning eligibility 변경 없음

## 11. Fixture 실행

- [x] 로컬 fixture runner
- [x] 테스트 후보 2건 실행
- [x] 불일치 후보 high severity 확인
- [x] shadow 적용 0건 확인

## 12. 실제 export 배치 shadow

- [x] 기존 D1 JSON export 형식 지원
- [x] 일괄 shadow 리포트 생성
- [x] 실제 D1 export 형식 테스트 통과
- [ ] 실제 213건 export에 provider를 연결한 비교 실행

## 13. 경량화·Python 엔진

- [ ] 현재 소형 모델 baseline 측정
- [ ] 중형 teacher 모델 준비
- [ ] 양자화/프루닝/지식 증류 비교
- [ ] Worker 호환 경량 artifact 생성
- [ ] 멀티모달·파인튜닝용 Python 서버 연결
- [ ] 소형/경량 중형/원본 중형 holdout 비교

## 14. 운영 승격

- [ ] 실제 provider 연결
- [ ] 독립 holdout 통과
- [ ] shadow 결과와 수동 검수 비교
- [ ] 제한된 후보만 candidate 승격
- [ ] active_model 연결
- [ ] 자동 승인 범위 단계적 확대
- [ ] 장애 시 rollback 리허설

## 현재 결론

현재는 **확장 구조와 안전 계약은 완료**되었고, **실제 모델 provider·학습 서버·멀티모달 저장소 연결은 아직 시작하지 않은 상태**다. 다음 운영 변경 전 필수 조건은 human-reviewed holdout 데이터와 실제 중형 모델 provider 선택이다.
