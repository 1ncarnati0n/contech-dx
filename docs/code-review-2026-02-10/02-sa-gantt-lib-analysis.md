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

### 1.2 기술 스택

| 영역 | 기술 |
|------|------|
| 빌드 | Vite 5.x |
| 상태 관리 | Zustand |
| 스타일링 | Tailwind CSS |
| 번들 형식 | ESM + UMD |

### 1.3 디렉토리 구조

```
packages/sa-gantt-lib/src/
├── lib/
│   ├── components/
│   │   ├── SAGanttChart.tsx      # 메인 컴포넌트 (40+ 자식)
│   │   ├── GanttSidebar.tsx      # 사이드바
│   │   ├── GanttTimeline.tsx     # 타임라인
│   │   ├── GanttTaskBar.tsx      # 작업 바
│   │   └── ...                   # 기타 컴포넌트
│   ├── store/
│   │   └── useGanttStore.ts      # Zustand 스토어
│   ├── hooks/
│   │   ├── useGanttDrag.ts       # 드래그 훅
│   │   ├── useGanttKeyboard.ts   # 키보드 훅
│   │   └── ...                   # 기타 훅
│   ├── types/
│   │   └── index.ts              # 타입 정의
│   ├── utils/
│   │   ├── dateUtils.ts          # 날짜 유틸
│   │   └── ...                   # 기타 유틸
│   └── services/
│       └── SupabaseGanttDataService.ts  # 데이터 서비스
├── index.ts                      # 라이브러리 진입점
└── vite.config.ts                # Vite 설정
```

---

## 2. 아키텍처 분석

### 2.1 컴포넌트 계층 구조

```
SAGanttChart (메인)
├── GanttHeader
│   ├── ViewModeSelector
│   ├── ZoomControls
│   └── ActionButtons
├── GanttContainer
│   ├── GanttSidebar
│   │   ├── TaskList
│   │   │   └── TaskRow (x N)
│   │   └── ResizeHandle
│   └── GanttTimeline
│       ├── TimelineHeader
│       │   └── TimelineCell (x M)
│       └── TimelineBody
│           └── TaskBar (x N)
│               ├── TaskBarContent
│               ├── DragHandle (left)
│               └── DragHandle (right)
└── GanttTooltip
```

**문제점**: 약 40개 이상의 자식 컴포넌트가 단일 트리에 집중

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

---

## 3. 발견된 이슈

### 3.1 [HIGH] 컴포넌트 복잡도

**문제점**:
- `SAGanttChart.tsx`가 40개 이상의 자식 컴포넌트 관리
- 깊은 렌더 트리로 인한 성능 우려
- 단일 파일의 책임이 과다

**권장 수정**:
```
현재: SAGanttChart.tsx (단일 진입점)

권장:
├── SAGanttChart.tsx          # 레이아웃만 담당
├── GanttViewContainer.tsx    # 뷰 모드별 라우팅
├── views/
│   ├── MasterView.tsx
│   ├── DetailView.tsx
│   └── UnifiedView.tsx
└── contexts/
    └── GanttContext.tsx      # 공통 컨텍스트
```

---

### 3.2 [HIGH] Props Drilling

**문제점**:
- 타임라인 설정, 콜백 등이 여러 레벨을 거쳐 전달
- 중간 컴포넌트가 불필요한 props에 의존

**예시**:
```typescript
// 현재 패턴
<SAGanttChart
  tasks={tasks}
  onTaskClick={handleTaskClick}
  onTaskDragEnd={handleDragEnd}
  // ... 20+ props
/>
  <GanttContainer tasks={tasks} onTaskClick={onTaskClick} ...>
    <GanttTimeline tasks={tasks} onTaskClick={onTaskClick} ...>
      <TaskBar task={task} onClick={() => onTaskClick(task.id)} ...>
```

**권장 수정**:
```typescript
// Context 활용 패턴
const GanttContext = createContext<GanttContextValue>(null);

<GanttProvider
  tasks={tasks}
  onTaskClick={handleTaskClick}
  onTaskDragEnd={handleDragEnd}
>
  <SAGanttChart />  {/* props 최소화 */}
</GanttProvider>

// 자식 컴포넌트에서
const { tasks, onTaskClick } = useGanttContext();
```

---

### 3.3 [MEDIUM] 훅 의존성 복잡도

**영향 파일**: `src/lib/hooks/*.ts`

**문제점**:
- 여러 훅이 `useGanttStore`에 중복 의존
- 훅 간 암묵적 의존 관계

**권장**:
- 훅 의존성 그래프 문서화
- 공통 로직을 별도 유틸로 분리

---

### 3.4 [MEDIUM] 테스트 커버리지 부족

**현황**:
- 테스트 파일: 약 9% 커버리지 추정
- 핵심 비즈니스 로직 테스트 부재

**권장**:
- `dateUtils.ts` 단위 테스트 우선 작성
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

**권장**:
```typescript
// 에러 바운더리 추가
<GanttErrorBoundary fallback={<GanttErrorFallback />}>
  <SAGanttChart />
</GanttErrorBoundary>
```

---

### 3.7 [LOW] 성능 최적화 여지

**개선 가능 영역**:
- 가상화(Virtualization): 대량 작업 시 DOM 최적화
- 메모이제이션: 계산 비용이 높은 연산 캐싱
- 렌더링 최적화: `React.memo` 적극 활용

**권장**:
```typescript
// 가상화 도입
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={containerHeight}
  itemCount={tasks.length}
  itemSize={ROW_HEIGHT}
>
  {({ index, style }) => (
    <TaskRow task={tasks[index]} style={style} />
  )}
</FixedSizeList>
```

---

### 3.8 [LOW] 상태 관리 복잡도

**문제점**:
- 선택 상태(`selectedTaskIds`)와 포커스 상태(`focusedTaskId`) 간 동기화 로직 복잡
- `lastClickedIndex`가 UI와 데이터 사이에서 혼재

**권장**:
- 선택 관련 상태를 별도 슬라이스로 분리
- 불변성 헬퍼 라이브러리 활용 (Immer)

---

## 4. 긍정적인 부분

### 4.1 잘 구현된 영역

- ✅ **Zustand 셀렉터 패턴**: `useShallow`로 불필요한 리렌더링 방지
- ✅ **뷰 모드 분리**: MASTER/DETAIL/UNIFIED 명확한 분리
- ✅ **드래그 상태 관리**: 단일/다중 드래그 로직 체계화
- ✅ **사이드바 리사이즈**: 제약 조건(`min/max`) 적용
- ✅ **키보드 네비게이션**: `moveFocus` 구현

### 4.2 재사용 가능한 패턴

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

## 5. 의존성 분석

### 5.1 외부 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `zustand` | ^4.x | 상태 관리 |
| `date-fns` | ^3.x | 날짜 처리 |
| `tailwindcss` | ^3.x | 스타일링 |

### 5.2 내부 의존성 그래프

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
```

---

## 6. 빌드 및 배포

### 6.1 빌드 프로세스

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

### 6.2 모노레포 통합

```json
// apps/web/package.json
{
  "dependencies": {
    "sa-gantt-lib": "*"
  }
}
```

⚠️ **주의**: 라이브러리 수정 시 반드시 빌드 후 web 빌드 필요

---

## 7. 다음 단계

1. **Phase 1**: Props Drilling 해소 (Context 도입)
2. **Phase 2**: 컴포넌트 분할 (`SAGanttChart` → 뷰 컴포넌트)
3. **Phase 3**: 테스트 커버리지 확대

자세한 리팩토링 로드맵은 [04-refactoring-roadmap.md](./04-refactoring-roadmap.md) 참조.

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었습니다.*
