# In Progress

기준일: `2026-03-06`

## Current Baseline

- 워크트리 상태: 조사 시점 기준 변경 파일 없음
- 테스트 상태:
  - `apps/web`: Jest `15` suites, `256` tests 통과
  - `packages/sa-gantt-lib`: Vitest `9` files, `186` tests 통과
- 소스 린트 상태:
  - `cd apps/web && npx eslint src`
  - 결과: `4 errors`, `2 warnings`

## Immediate TODO

- [ ] `apps/web/src/components/buildings/BuildingProcessPlanPage.tsx`에서 층별 일수 계산 헬퍼 선언 순서를 정리해 린트 에러 4건 해소
- [ ] `apps/web/src/components/projects/ProjectSettingsPage.tsx`의 미사용 import 제거
- [ ] `apps/web/src/components/projects/ProjectTeamPage.tsx`의 미사용 import 제거
- [ ] 루트 `npm run lint`가 생성물(`apps/web/coverage`, `apps/web/public/wasm/worker.mjs`)을 검사하지 않도록 ignore 또는 스크립트 조정

## Data Persistence TODO

- [ ] 빌딩/공정계획 영역의 `localStorage` 사용처를 전수 확인하고, UI 상태 저장과 업무 데이터 저장을 분리
- [ ] `process logic`, `process plan`, `gantt import` 흐름에서 어떤 데이터가 아직 브라우저 저장소에만 남는지 문서화
- [ ] 공정계획 데이터를 Supabase로 일원화할지, 일부 로컬 초안 상태를 유지할지 정책 결정

## Gantt Integration TODO

- [ ] `packages/sa-gantt-lib` 공개 타입과 `apps/web` 사용부를 맞추기
  - 예: `apps/web/src/lib/services/SupabaseGanttDataService.ts`의 로컬 `MilestoneType` 중복 정리
- [ ] 라이브러리 변경 시 `npm run build:lib -> npm run build` 순서가 필요한 이유와 영향 범위를 README/문서에 계속 반영
- [ ] 공정계획 -> 간트 변환 로직(`apps/web/src/lib/utils/process-to-gantt-converter.ts`)과 실제 저장 데이터 구조 차이를 점검

## API / Auth TODO

- [ ] 전체 API `12`개 라우트의 인증/검증 적용 상태를 한 번 더 점검
- [ ] `upload-file` 라우트의 multipart 예외 처리를 문서화하거나 공통 패턴으로 정리
- [ ] 관리자 전용/개발 전용 경로(`promote-to-admin`, admin routes)의 배포 안전성 재확인

## Docs / Repo Hygiene TODO

- [ ] README와 실제 저장 구조, 검증 상태, 문서 위치를 계속 동기화
- [ ] `docs/`에 현재 구조를 설명하는 아키텍처/데이터 흐름 문서를 추가할지 결정
- [ ] `packageManager: pnpm` 메타데이터와 실제 `npm + package-lock.json` 운영 방식을 통일
