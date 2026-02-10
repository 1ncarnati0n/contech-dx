# sa-gantt-lib 상세 분석

> **분석일**: 2026-02-10
> **대상**: `packages/sa-gantt-lib` (Vite 기반 라이브러리)

---

## 1. 라이브러리 개요

### 1.1 목적

건설 프로젝트 관리를 위한 커스텀 간트 차트 라이브러리:
- 마스터/디테일/통합 뷰 모드 지원
- 다중 작업 선택 및 드래그
- 줌 레벨 조정 (일/주/월)
- Supabase 통합 데이터 서비스
- 한국 공휴일 기반 달력 시스템

### 1.2 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 빌드 | Vite | ^5.2.0 |
| 상태 관리 | Zustand | ^5.0.8 |
| 가상화 | @tanstack/react-virtual | ^3.13.12 |
| 날짜 처리 | date-fns | ^4.1.0 |
| 스타일링 | Tailwind CSS | ^4.0.0 |
| 차트/시각화 | D3 | ^7.9.0 |
| 불변 상태 | Immer | ^11.1.3 |
| 번들 형식 | ESM + UMD | - |

### 1.3 디렉토리 구조

```
packages/sa-gantt-lib/src/
├── lib/
│   ├── components/
│   │   ├── GanttChart/             # 메인 컴포넌트 디렉토리
│   │   │   ├── index.tsx           # 메인 컴포넌트 (634 LOC)
│   │   │   ├── GanttHeader.tsx     # 헤더 (줌, 뷰모드 등)
│   │   │   ├── types.ts            # 컴포넌트 타입 정의
│   │   │   └── hooks/              # 컴포넌트 전용 훅
│   │   │       ├── useVisibleTasks.ts      # 가시 태스크 필터링 (142 LOC)
│   │   │       ├── useExpandCollapse.ts    # 확장/축소
│   │   │       ├── useGanttHandlers.ts     # 이벤트 핸들러
│   │   │       ├── useGanttInit.ts         # 초기화
│   │   │       ├── useScrollToDate.ts      # 날짜 스크롤
│   │   │       ├── useSidebarColumns.ts    # 사이드바 컬럼
│   │   │       └── useSidebarResize.ts     # 사이드바 리사이즈
│   │   ├── GanttSidebar/           # 사이드바 컴포넌트 (11개 하위 파일)
│   │   ├── GanttTimeline/          # 타임라인 컴포넌트 (16개 하위 파일)
│   │   ├── BlockBar.tsx            # 블록 바
│   │   ├── CriticalPathBar.tsx     # 크리티컬 패스 바
│   │   ├── GroupSummaryBar.tsx     # 그룹 요약 바
│   │   ├── WorkDaysRatioBar.tsx    # 작업일 비율 바
│   │   ├── GanttErrorBoundary.tsx  # 에러 바운더리
│   │   ├── TaskEditModal.tsx       # 태스크 편집 모달
│   │   ├── MilestoneEditModal.tsx  # 마일스톤 편집 모달
│   │   ├── ThemeToggle.tsx         # 테마 토글
│   │   ├── forms/                  # 폼 컴포넌트
│   │   └── ui/                     # UI 기본 컴포넌트
│   ├── context/
│   │   ├── GanttContext.tsx         # 간트 컨텍스트 (168 LOC) ✅
│   │   └── ThemeContext.tsx         # 테마 컨텍스트
│   ├── store/
│   │   └── useGanttStore.ts        # Zustand 스토어
│   ├── hooks/
│   │   ├── useGanttVirtualization.ts  # 가상화 훅 (143 LOC)
│   │   ├── useColumnResizer.ts     # 컬럼 리사이즈
│   │   ├── useHistory.ts           # 히스토리 관리
│   │   ├── useKeyboardNavigation.ts # 키보드 네비게이션
│   │   └── useTaskFocus.ts         # 태스크 포커스
│   ├── types/
│   │   ├── core.ts                 # 핵심 타입
│   │   ├── props.ts                # Props 타입
│   │   ├── calendar.ts             # 달력 타입
│   │   ├── ui.ts                   # UI 타입
│   │   ├── constants.ts            # 상수
│   │   └── index.ts                # 타입 re-export
│   ├── utils/
│   │   ├── date/                   # 날짜 유틸 (995 LOC 합계)
│   │   │   ├── holiday.ts          # 공휴일 처리 (178 LOC)
│   │   │   ├── koreanHolidays.ts   # 한국 공휴일 데이터 (151 LOC)
│   │   │   ├── dualCalendar.ts     # 이중 달력 (149 LOC)
│   │   │   ├── workingDays.ts      # 작업일 계산 (270 LOC)
│   │   │   ├── validation.ts       # 날짜 검증 (96 LOC)
│   │   │   ├── conversion.ts       # 날짜 변환 (94 LOC)
│   │   │   └── index.ts            # re-export (57 LOC)
│   │   ├── criticalPath/           # 크리티컬 패스 유틸
│   │   ├── __tests__/              # 유틸 테스트
│   │   └── ...                     # 기타 유틸
│   └── services/
│       └── SupabaseGanttDataService.ts  # 데이터 서비스
├── index.ts                        # 라이브러리 진입점 (290 LOC)
└── vite.config.ts                  # Vite 설정
```

---

## 2. 아키텍처 분석

### 2.1 컴포넌트 계층 구조

```
GanttChart/index.tsx (634 LOC, 메인 진입점)
├── GanttHeader
│   ├── ViewModeSelector
│   ├── ZoomControls
│   └── ActionButtons
├── GanttSidebar/
│   ├── SidebarHeader
│   ├── TaskList (가상화 적용)
│   │   └── TaskRow (x N)
│   ├── ResizeHandle
│   └── ContextMenu
├── GanttTimeline/
│   ├── TimelineHeader
│   │   └── TimelineCell (x M)
│   └── TimelineBody (가상화 적용)
│       └── TaskBar (x N)
│           ├── TaskBarContent
│           ├── DragHandle (left)
│           └── DragHandle (right)
├── TaskEditModal
├── MilestoneEditModal
└── GanttErrorBoundary
```

**구조적 특성**:
- `GanttChart/index.tsx`(634 LOC)가 메인 컨테이너 역할
- 컴포넌트별 하위 디렉토리로 분리 (GanttSidebar/, GanttTimeline/)
- 컴포넌트 전용 훅이 `GanttChart/hooks/`에 집중

### 2.2 상태 관리 (useGanttStore)

**파일**: `src/lib/store/useGanttStore.ts` (408 LOC)

```typescript
export const useGanttStore = create<GanttStore>((set, get) => ({
  // ====================================
  // Initial State
  // ====================================

  // View State
  viewMode: 'MASTER',
  activeCPId: null,
  zoomLevel: 'MONTH',

  // UI Interaction State - Selection
  selectedTaskIds: new Set<string>(),
  focusedTaskId: null,
  lastClickedIndex: null,

  // UI Interaction State - Hover & Expand
  hoveredTaskId: null,
  expandedTaskIds: new Set<string>(),

  // Sidebar
  sidebarWidth: GANTT_LAYOUT.SIDEBAR_WIDTH,

  // Drag State
  isDragging: false,
  dragType: null,
  dragTaskId: null,

  // Multi-Drag State
  isMultiDragging: false,
  multiDragPrimaryId: null,

  // Compact Mode
  isCompactMode: false,

  // ... actions ...
}));
```

**긍정적인 부분**:
- ✅ 셀렉터 훅으로 성능 최적화 (`useShallow`)
- ✅ 액션별 논리적 그룹화
- ✅ UI 상태와 데이터 분리

**개선 필요**:
- ⚠️ 단일 스토어에 모든 상태 집중
- ⚠️ 복잡한 선택 로직이 스토어에 직접 구현됨

### 2.3 Context 시스템

**파일**: `src/lib/context/GanttContext.tsx` (168 LOC)

GanttContext가 이미 구현되어 있으며, 데이터 및 콜백을 자식 컴포넌트에 제공:
- 태스크 데이터, 마일스톤, 설정값 공유
- 콜백 함수 (onTaskClick, onTaskUpdate 등) 전달
- Props Drilling을 **부분적으로 해소**

추가로 `ThemeContext.tsx`가 테마 관련 상태를 관리.

---

## 3. 발견된 이슈

### 3.1 [HIGH] 컴포넌트 복잡도

**문제점**:
- `GanttChart/index.tsx`(634 LOC)가 다수의 자식 컴포넌트를 조합
- 7개의 전용 훅 의존 (useVisibleTasks, useExpandCollapse, useGanttHandlers 등)
- 깊은 렌더 트리로 인한 성능 우려

**현재 완화 요소**:
- ✅ 컴포넌트별 디렉토리 분리 (GanttSidebar/, GanttTimeline/)
- ✅ 전용 훅으로 로직 분산 (GanttChart/hooks/)
- ✅ GanttContext로 props 전달 최소화

**추가 권장**:
```
현재: GanttChart/index.tsx (634 LOC, 단일 진입점)

권장:
├── GanttChart/index.tsx      # 레이아웃만 담당 (~200 LOC)
├── GanttViewContainer.tsx    # 뷰 모드별 라우팅
├── views/
│   ├── MasterView.tsx
│   ├── DetailView.tsx
│   └── UnifiedView.tsx
└── contexts/
    └── GanttContext.tsx       # 이미 존재 (168 LOC) → 확장
```

---

### 3.2 [MEDIUM] Props Drilling (부분 해소)

**현황**:
- GanttContext(168 LOC)가 **이미 도입**되어 주요 데이터/콜백을 Context로 전달
- 일부 타임라인 설정, 세부 콜백 등이 여전히 props로 전달

**이미 해결된 부분**:
```typescript
// GanttContext를 통한 데이터 공유 (이미 구현됨)
const { tasks, onTaskClick, config } = useGanttContext();
```

**남은 개선 사항**:
- GanttContext 범위 확장 (타임라인 설정, 줌 설정 등 포함)
- 중간 컴포넌트의 불필요한 props 제거

---

### 3.3 [MEDIUM] 훅 의존성 복잡도

**영향 파일**: `src/lib/hooks/*.ts`, `src/lib/components/GanttChart/hooks/*.ts`

**문제점**:
- 여러 훅이 `useGanttStore`에 중복 의존
- 두 레벨의 훅 디렉토리 (lib/hooks/ + GanttChart/hooks/)
- 훅 간 암묵적 의존 관계

**권장**:
- 훅 의존성 그래프 문서화
- 공통 로직을 별도 유틸로 분리

---

### 3.4 [MEDIUM] 테스트 커버리지 부족

**현황**:
- `utils/__tests__/`에 유틸리티 테스트 존재
- 핵심 비즈니스 로직(달력 계산, 크리티컬 패스) 테스트 부재
- 컴포넌트 테스트 미작성

**권장**:
- `dateUtils` 및 달력 시스템 단위 테스트 확대
- `useGanttStore` 액션 테스트
- 주요 컴포넌트 스냅샷 테스트

---

### 3.5 [MEDIUM] 문서화 부족

**문제점**:
- 컴포넌트 Props 문서 미흡
- 사용 예시 부족
- 스토어 액션 설명 없음

**권장**:
- TSDoc 주석 추가
- README에 Quick Start 섹션
- Storybook 도입 검토

---

### 3.6 [LOW] 에러 처리 일관성

**문제점**:
- 드래그 작업 실패 시 에러 처리 불완전
- 데이터 로딩 실패 시 UI 피드백 부재

**긍정적 부분**:
- ✅ `GanttErrorBoundary.tsx` 이미 구현됨

**추가 권장**:
- 에러 바운더리 활용 범위 확대
- 데이터 로딩 실패 시 fallback UI 추가

---

### 3.7 [LOW] 성능 최적화 (부분 구현됨)

**이미 구현된 최적화**:
- ✅ **가상화**: `@tanstack/react-virtual`을 통한 DOM 최적화 (`useGanttVirtualization.ts`, 143 LOC)
- ✅ **가시 태스크 필터링**: `useVisibleTasks.ts` (142 LOC) - 뷰포트 내 태스크만 렌더링
- ✅ **셀렉터 최적화**: `useShallow`로 불필요한 리렌더링 방지
- ✅ **Immer 활용**: 불변 상태 업데이트 최적화

**추가 개선 가능 영역**:
- 메모이제이션: 계산 비용이 높은 연산 캐싱 강화
- `React.memo` 적극 활용 (특히 TaskBar, TaskRow)
- 날짜 계산 결과 캐싱

---

### 3.8 [LOW] 상태 관리 복잡도

**문제점**:
- 선택 상태(`selectedTaskIds`)와 포커스 상태(`focusedTaskId`) 간 동기화 로직 복잡
- `lastClickedIndex`가 UI와 데이터 사이에서 혼재

**권장**:
- 선택 관련 상태를 별도 슬라이스로 분리
- Immer가 이미 도입됨 → 스토어 액션에서 적극 활용

---

## 4. 달력 시스템

### 4.1 개요

sa-gantt-lib는 건설 프로젝트 특화 달력 시스템을 내장하고 있으며, `utils/date/` 디렉토리에 총 **995 LOC**로 구현됨.

### 4.2 한국 공휴일 (`koreanHolidays.ts`, 151 LOC)

- 2025~2027년 한국 공휴일 데이터 내장
- `getKoreanHolidaysByYear()`, `getKoreanHolidaysForYears()` 함수 제공
- 대체공휴일 등 특수 공휴일 포함

### 4.3 이중 달력 (`dualCalendar.ts`, 149 LOC)

- 양력/음력 이중 달력 지원
- 건설 공정에서 작업일(근무일 기준)과 역일(달력일 기준) 이중 계산

### 4.4 작업일 계산 (`workingDays.ts`, 270 LOC)

- 주말/공휴일 제외한 실제 작업일 계산
- 작업일 ↔ 역일 변환
- 공정 기간 산정의 핵심 로직

### 4.5 공휴일 처리 (`holiday.ts`, 178 LOC)

- 공휴일 판정 및 필터링
- 커스텀 휴일 추가 지원

---

## 5. 긍정적인 부분

### 5.1 잘 구현된 영역

- ✅ **Zustand 셀렉터 패턴**: `useShallow`로 불필요한 리렌더링 방지
- ✅ **뷰 모드 분리**: MASTER/DETAIL/UNIFIED 명확한 분리
- ✅ **드래그 상태 관리**: 단일/다중 드래그 로직 체계화
- ✅ **사이드바 리사이즈**: 제약 조건(`min/max`) 적용
- ✅ **키보드 네비게이션**: `moveFocus` 구현
- ✅ **가상화**: `@tanstack/react-virtual` 기반 가상 스크롤 구현
- ✅ **Context 도입**: `GanttContext`(168 LOC)로 Props Drilling 부분 해소
- ✅ **에러 바운더리**: `GanttErrorBoundary` 구현
- ✅ **달력 시스템**: 한국 공휴일, 이중 달력, 작업일 계산 (995 LOC)

### 5.2 재사용 가능한 패턴

```typescript
// 셀렉터 훅 패턴 - 다른 Zustand 스토어에 적용 가능
export const useGanttViewState = () =>
  useGanttStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      activeCPId: state.activeCPId,
      zoomLevel: state.zoomLevel,
    }))
  );
```

---

## 6. 의존성 분석

### 6.1 외부 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `zustand` | ^5.0.8 | 상태 관리 |
| `@tanstack/react-virtual` | ^3.13.12 | 가상 스크롤 |
| `date-fns` | ^4.1.0 | 날짜 처리 |
| `d3` | ^7.9.0 | 차트/시각화 |
| `immer` | ^11.1.3 | 불변 상태 업데이트 |
| `tailwindcss` | ^4.0.0 | 스타일링 (devDep) |
| `exceljs` | ^4.4.0 | 엑셀 내보내기 |
| `lucide-react` | ^0.554.0 | 아이콘 |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.4.0 | 클래스 유틸 |

### 6.2 내부 의존성 그래프

```
useGanttStore
    ↑
    ├── useGanttViewState
    ├── useGanttSelection
    ├── useGanttHover
    ├── useGanttExpansion
    ├── useGanttSidebar
    ├── useGanttDrag
    ├── useGanttMultiDrag
    └── useGanttCompactMode
        ↑
        └── [컴포넌트들]

GanttContext (168 LOC)
    ↑
    ├── GanttChart/index.tsx (Provider)
    └── [자식 컴포넌트들] (Consumer)

useGanttVirtualization (143 LOC)
    ↑
    └── GanttChart/index.tsx
        └── useVisibleTasks (142 LOC)
```

---

## 7. 빌드 및 배포

### 7.1 빌드 프로세스

```bash
# 라이브러리 빌드
cd packages/sa-gantt-lib
npm run build

# 출력
dist/
├── sa-gantt-lib.es.js    # ESM 번들
├── sa-gantt-lib.umd.js   # UMD 번들
├── index.d.ts            # 타입 정의
└── style.css             # 스타일
```

### 7.2 모노레포 통합

```json
// apps/web/package.json
{
  "dependencies": {
    "sa-gantt-lib": "*"
  }
}
```

> **주의**: 라이브러리 수정 시 반드시 빌드 후 web 빌드 필요

---

## 8. 다음 단계

1. **Phase 1**: GanttContext 범위 확장 (타임라인 설정, 줌 등 추가)
2. **Phase 2**: `GanttChart/index.tsx`(634 LOC) → 뷰 컴포넌트 분할
3. **Phase 3**: 달력 시스템 테스트 커버리지 확대

자세한 리팩토링 로드맵은 [04-refactoring-roadmap.md](./04-refactoring-roadmap.md) 참조.

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었으며, 2026-02-10 정확성 교정이 완료되었습니다.*
