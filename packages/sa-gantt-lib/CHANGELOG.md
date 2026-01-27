# Changelog

이 프로젝트의 주요 변경사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)를 따르며,
[Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 준수합니다.

## [0.1.2] - 2025-01-15

### 🔄 대규모 리팩토링

총 **3,864줄 → 2,684줄 (31% 감소)**, 186개 테스트 통과

#### Phase 1: 인프라 및 테스트 기반
- ESLint/Prettier 설정 추가
- Path Alias 설정 (`@/components/*`, `@/hooks/*`, `@/utils/*`)
- 테스트 인프라 확장 (dragUtils 테스트 추가)

#### Phase 2: 드래그 전략 패턴 적용
- `dragStrategies/` 폴더에 6개 전략 파일 분리
  - `moveStrategy.ts` - 전체 이동 로직
  - `moveNetStrategy.ts` - 순작업 이동 로직
  - `resizePreStrategy.ts` - 선간접 리사이즈
  - `resizePostStrategy.ts` - 후간접 리사이즈
  - `boundaryStrategy.ts` - 경계 조절 로직
  - `index.ts` - 전략 팩토리

#### Phase 3: GanttTimeline 분할 (1,490줄 → 1,012줄, -32%)
- `useTimelineCore.ts` 훅 추출 (514줄)
  - 타임라인 계산 로직 캡슐화
  - 드래그 핸들러, 이벤트 핸들러 통합
- `GridLinesRenderer.tsx` 컴포넌트 분리 (138줄)
  - 수직/수평 그리드 라인 렌더러
  - 그룹 행 배경 렌더러

#### Phase 4: GanttChart Props 정리 (1,041줄 → 604줄, -42%)
- `useSidebarColumns.ts` 훅 추출 (~150줄)
  - 뷰모드별 컬럼 상태 관리
  - 컬럼 리사이즈 로직
- `useExpandCollapse.ts` 훅 추출 (~170줄)
  - O(1) Map 기반 펼침/접기 로직
  - 레벨별 확장/축소
- `useGanttHandlers.ts` 훅 추출 (~290줄)
  - 모달, 드래그, 태스크 핸들러 통합
  - `GanttErrorContext` 타입 일관성 유지

#### Phase 5: GanttSidebar 분리 (756줄 → 584줄, -23%)
- `useSidebarData.ts` 훅 추출 (207줄)
  - O(1) 조회용 Map 구조 (`taskMap`, `childrenCountMap`, `cpSummaryMap`)
  - 동적 행 높이 계산
  - Critical Path 요약 계산
- `MilestoneLaneSpacer.tsx` 컴포넌트 분리 (54줄)
  - 중복 코드 제거

#### Phase 6: DetailTaskBar 단순화 (577줄 → 484줄, -16%)
- `useHoverZone.ts` 훅 추출 (122줄)
  - 호버 영역 감지 로직
  - 커서 스타일 결정
- `useEffectiveDates.ts` 훅 추출 (108줄)
  - 드래그 우선순위 적용 날짜 계산
  - 개별 드래그 > 종속성 드래그 > 그룹 드래그 > 원본

### 추가됨

- **새로운 커스텀 훅들**
  - `useTimelineCore` - 타임라인 코어 계산 로직
  - `useHoverZone` - 호버 영역 감지
  - `useEffectiveDates` - 효과적인 날짜 계산
  - `useSidebarData` - 사이드바 데이터 계산
  - `useSidebarColumns` - 컬럼 상태 관리
  - `useExpandCollapse` - 펼침/접기 로직
  - `useGanttHandlers` - 핸들러 통합

- **새로운 컴포넌트들**
  - `GridLinesRenderer` - 그리드 라인 렌더러
  - `MilestoneLaneSpacer` - 마일스톤 레인 스페이서

### 변경됨

- **타입 일관성 개선**
  - `GanttErrorContext` 타입을 모든 훅에서 재사용
  - `VirtualRow` 인터페이스 통일

### 내부 개선

- `sharedRowProps` 패턴으로 Props drilling 개선
- `renderRowContent()` 함수로 뷰모드별 렌더링 통합
- 미사용 import 정리 (TypeScript 6133 경고 해결)

---

## [0.1.1] - 2025-12-15

### Added

- **Date Validation Utilities**: New validation functions for date handling
  - `isValidDate()` - Check if a value is a valid Date object
  - `isValidDateRange()` - Validate that start date is before or equal to end date
  - `validateTaskDates()` - Validate task date ranges
  - `parseDateSafe()` - Safely parse date strings with null fallback
  - `isSameDay()` - Compare two dates ignoring time

- **Cycle Detection**: Dependency graph cycle detection utilities
  - `detectCyclicDependency()` - Detect cycles in dependency graph using DFS
  - `wouldCreateCycle()` - Check if adding a dependency would create a cycle
  - `CycleDetectionResult` interface for structured results

- **Async Error Handling**: Modal components now handle async callbacks properly
  - `TaskEditModal` - Added try-catch with loading state for save/delete
  - `MilestoneEditModal` - Added try-catch with loading state for save/delete

### Changed

- **`collectDescendantTasks` Function**: Extended with options parameter
  - Added `wbsLevel` option to filter by WBS level
  - Added `includeTypes` option to specify which task types to collect
  - Added `includeGroups` option to include GROUP tasks in results
  - Backward compatible - existing code works without changes

- **Performance Optimizations**: `SidebarRowMaster` component
  - `formatNum` moved outside component (pure function)
  - `getRowStyle` replaced with `useMemo` hook
  - Event handlers wrapped with `useCallback`

### Fixed

- **Code Duplication**: Removed duplicate `collectDescendantTasks` implementations
  - `GanttSidebar/index.tsx` - Now uses shared utility
  - `TaskBar.tsx` - Now uses shared utility

### Internal

- Added test files for new utilities
  - `validation.test.ts` - Date validation tests
  - `dependencyGraph.test.ts` - Cycle detection tests

## [0.1.0-beta] - 2025-12-10

### Added

- Initial beta release
- GanttChart, GanttSidebar, GanttTimeline components
- Critical Path calculation
- Dual calendar system (working days / calendar days)
- Drag and drop for tasks and dependencies
- Virtualization support with @tanstack/react-virtual
- Dark/Light theme support
- Undo/Redo history
- Import/Export JSON
- Korean holidays support (2025-2027)
