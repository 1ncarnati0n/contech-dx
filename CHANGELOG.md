# Changelog

## 2026-02-06

### Code Quality
- **console.* → logger.* 전면 마이그레이션**: 42개 파일, ~169건의 console 호출을 logger 유틸리티로 전환
- **`any` 타입 제거**: `buildings.ts` filterTradeData 함수의 3곳 `any` 타입을 `TradeData`, `Record<string, OverviewTradeFields>`, `TradeFieldData`로 교체
- **API 응답 형식 표준화**: gemini 관련 8개 라우트의 에러 응답에 `success: false` 추가
- **파일 업로드 null 안전성**: `upload-file/route.ts`의 파일 확장자 파싱에 null 체크 추가

## 2026-02-05

### Process Module Data Connection
- B1+B2 통합 참조 계산 구현 (`F_B1B2_COMBINED`, `D_B1B2_COMBINED` 등)
- moduleId 기반 명시적 모듈 선택 시스템
- 층 라벨 유틸리티 함수 추가 (`normalizeFloorLabel`, `isBasementParking`)

### Architecture
- 주동 지하층 모듈 구조 리팩토링: 3개 → 2개 모듈로 통합
- 지하층 카테고리 명칭 변경: '지하층' → '주동 지하층'

### Performance
- 프로덕션 성능 최적화 Day 1-4 완료 (누적 1,280ms 개선)
  - Serial Queries 캐싱 (350ms)
  - Overview 탭 데이터 필터링 (400ms)
  - localStorage Throttling (30ms)
  - 클라이언트 사이드 탭 전환 (500ms)

### UI/UX
- 공정계획 탭 디자인 시스템 통일 (zinc/accent 토큰)
- 세부공정 패널 독립화 (rowSpan → 독립 패널)
- 공정모듈 고급편집 드래그 앤 드롭 순서 변경 (@dnd-kit)
- 공정로직 설정 관리 통합 (UnifiedSettingsModal)
- 물량입력 표 셀 주소 수정 (공정모듈 참조와 100% 일치)

### Refactored
- apps/web 리팩토링: 중복 파일 통합 (561줄 감소), `as any` 3곳 제거
- 물량참조 로직 개선 (79.44% 커버리지, 48개 테스트 추가)
- 비직영 공사 계산 함수 추가 (`calculateIndirectWorkers`, `calculateIndirectEquipment`)
- 층별 일수 계산 및 UI 통합 (FloorDetailsTable)

### Fixed
- IFC 뷰어 초기 다크모드 이슈 해결
- B1/B2 순서 정렬, 옥탑층 tradeGroup 설정, Row 13-25 매칭 로직 수정

## 2026-02-04

### Changed
- IFC 3D 뷰어: 복잡한 최적화 구조(29개 파일)를 안정적인 단순 버전(2개 파일)으로 복원

## 2025-02-04

### Added
- 공정모듈 계산 로직 시각화 (일수고정/물량계산/장비기반 뱃지)
- 공정로직 탭 (FormulaSection, ProcessModuleSection, CycleDefinitionSection)

### Refactored
- BuildingProcessPlanPage: 2,886줄 → 2,275줄 (21% 축소)
- BuildingBasicInfo: Compound Component 패턴으로 리팩토링

## 2025-02-03

### Fixed
- 타입 변환 버그: 빈 문자열이 0으로 변환되던 문제
- 프로젝트 멤버 권한 체크: 프로젝트 번호/UUID 불일치 해결

### Added
- 그룹 종속선 클러스터 동시 이동 (간트차트)
- 관리자 권한 예외 처리

## 2025-01-28

### Changed
- pnpm → npm 마이그레이션 (Vercel 배포 호환성)
- Vercel 빌드 순서 수정 (`sa-gantt-lib` → `web`)
