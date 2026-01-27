# SA-Gantt-Lib

<div align="center">

**건설 공정표 전문 간트 차트 라이브러리**

[![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)](https://github.com/your-repo/sa-gantt-lib)
[![React](https://img.shields.io/badge/React-18%2F19-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## ✨ 주요 기능

- **2단계 뷰 시스템**
  - Level 1 (Master View): 공구공정표 - Critical Path 단위 전체 일정 관리
  - Level 2 (Detail View): 주공정표 - 개별 작업 단위 상세 일정 관리

- **건설 도메인 특화 날짜 계산**
  - 순작업일 (Net Work): 휴일 제외 실제 작업일
  - 간접작업일 (Indirect Work): 휴일 포함, 선/후 분리
  - 작업일/비작업일 자동 집계

- **앵커 기반 종속성 시스템** 🆕
  - 태스크 바 내 Day 단위 앵커 포인트
  - 드래그로 종속성 연결/삭제
  - 연결된 태스크 그룹 동시 이동
  - 실시간 시각적 피드백 (드래그 중 연결 강조)

- **고성능 렌더링**
  - @tanstack/react-virtual 기반 가상화
  - 대용량 데이터 처리 최적화

- **풍부한 인터렉션**
  - 드래그 앤 드롭 (바 이동, 리사이즈)
  - 줌 레벨 (일/주/월)
  - 마일스톤 관리
  - Undo/Redo 지원 (Immer patches 기반 메모리 최적화) 🆕

- **데이터 서비스 추상화** 🆕
  - `DataService` 인터페이스로 저장소 분리
  - `LocalStorageService` 기본 구현
  - Supabase 등 외부 DB 전환 용이

---

## 🛠️ 기술 스택

### Core Framework

| 기술 | 버전 | 용도 |
|------|------|------|
| React | ^18.0.0 \|\| ^19.0.0 | UI 컴포넌트 라이브러리 (peerDependency) |
| TypeScript | ^5.0.0 | 정적 타입 시스템 |

### Build & Bundle

| 기술 | 버전 | 용도 |
|------|------|------|
| Vite | ^5.2.0 | 빌드 도구 및 개발 서버 |
| vite-plugin-dts | ^3.9.1 | TypeScript 선언 파일(.d.ts) 자동 생성 |
| PostCSS | ^8.4.38 | CSS 후처리기 |
| Autoprefixer | ^10.4.19 | 벤더 프리픽스 자동 추가 |

### Styling

| 기술 | 버전 | 용도 |
|------|------|------|
| TailwindCSS | ^4.0.0 | 유틸리티 기반 CSS 프레임워크 |
| @tailwindcss/postcss | ^4.1.17 | Tailwind PostCSS 통합 |
| clsx | ^2.1.1 | 조건부 className 결합 |
| tailwind-merge | ^3.4.0 | Tailwind 클래스 충돌 해결 |

### State Management

| 기술 | 버전 | 용도 |
|------|------|------|
| Zustand | ^5.0.8 | 경량 상태 관리 라이브러리 |
| Immer | ^10.x | 불변 상태 업데이트 및 히스토리 최적화 🆕 |

### UI & Visualization

| 기술 | 버전 | 용도 |
|------|------|------|
| D3.js | ^7.9.0 | 데이터 시각화 및 SVG 조작 |
| @tanstack/react-virtual | ^3.13.12 | 가상화 스크롤 (대용량 데이터 최적화) |
| lucide-react | ^0.554.0 | 아이콘 라이브러리 |

### Date & Time

| 기술 | 버전 | 용도 |
|------|------|------|
| date-fns | ^4.1.0 | 날짜 계산 및 포맷팅 |

### Testing

| 기술 | 버전 | 용도 |
|------|------|------|
| Vitest | ^1.6.1 | 단위 테스트 프레임워크 |
| @vitest/coverage-v8 | ^1.6.1 | 코드 커버리지 리포트 |
| @testing-library/react | ^16.3.0 | React 컴포넌트 테스트 유틸리티 |
| @testing-library/jest-dom | ^6.9.1 | DOM 매처 확장 |
| jsdom | ^27.0.1 | 브라우저 환경 시뮬레이션 |

### Module Format

| 포맷 | 출력 파일 | 용도 |
|------|----------|------|
| ES Module | `dist/index.es.js` | 모던 번들러 지원 (Vite, Webpack 5+) |
| UMD | `dist/index.umd.js` | CommonJS 및 브라우저 직접 사용 |
| TypeScript | `dist/index.d.ts` | 타입 정의 파일 |

---

## 📦 설치

```bash
npm install sa-gantt-lib
# or
yarn add sa-gantt-lib
# or
pnpm add sa-gantt-lib
```

---

## 🚀 빠른 시작

```tsx
import { GanttChart, ConstructionTask, Milestone } from 'sa-gantt-lib';
import 'sa-gantt-lib/style.css';

const tasks: ConstructionTask[] = [
  {
    id: 'cp-1',
    parentId: null,
    wbsLevel: 1,
    type: 'CP',
    name: '지하골조공사',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    cp: { workDaysTotal: 60, nonWorkDaysTotal: 31 },
    dependencies: [],
  },
  // ... more tasks
];

const milestones: Milestone[] = [
  { id: 'm-1', date: new Date('2024-01-01'), name: '착공' },
  { id: 'm-2', date: new Date('2024-12-31'), name: '준공' },
];

function App() {
  const handleTaskUpdate = (task: ConstructionTask) => {
    console.log('Task updated:', task);
  };

  return (
    <GanttChart
      tasks={tasks}
      milestones={milestones}
      onTaskUpdate={handleTaskUpdate}
      initialView="MASTER"
      initialZoomLevel="WEEK"
    />
  );
}
```

---

## 📖 API 참조

### GanttChart Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tasks` | `ConstructionTask[]` | ✅ | 작업 목록 |
| `milestones` | `Milestone[]` | - | 마일스톤 목록 |
| `holidays` | `Date[]` | - | 휴일 목록 |
| `calendarSettings` | `CalendarSettings` | - | 캘린더 설정 |
| `initialView` | `'MASTER' \| 'DETAIL'` | - | 초기 뷰 모드 |
| `initialZoomLevel` | `'DAY' \| 'WEEK' \| 'MONTH'` | - | 초기 줌 레벨 |
| `onTaskUpdate` | `(task) => void` | - | 작업 수정 콜백 |
| `onTaskCreate` | `(task) => void` | - | 작업 생성 콜백 |
| `onTaskDelete` | `(taskId) => void` | - | 작업 삭제 콜백 |
| `onMilestoneUpdate` | `(milestone) => void` | - | 마일스톤 수정 콜백 |

### 핵심 타입

```typescript
// 작업 데이터
interface ConstructionTask {
  id: string;
  parentId: string | null;
  wbsLevel: 1 | 2;
  type: 'GROUP' | 'CP' | 'TASK';
  name: string;
  startDate: Date;
  endDate: Date;
  cp?: CPData;       // Level 1 전용
  task?: TaskData;   // Level 2 전용
  dependencies: Dependency[];
}

// Level 1 데이터 (공구공정표)
interface CPData {
  workDaysTotal: number;      // 작업일수
  nonWorkDaysTotal: number;   // 비작업일수
}

// Level 2 데이터 (주공정표)
interface TaskData {
  netWorkDays: number;           // 순작업일
  indirectWorkDaysPre: number;   // 선간접작업일
  indirectWorkDaysPost: number;  // 후간접작업일
}

// 마일스톤
interface Milestone {
  id: string;
  date: Date;
  name: string;
  description?: string;
}
```

### Exports

```typescript
// 컴포넌트
export { GanttChart, GanttSidebar, GanttTimeline, TaskEditModal };

// 스토어 훅
export { useGanttStore, useGanttViewState, useGanttSelection };

// 유틸리티
export { dateToX, xToDate, addWorkingDays, calculateCriticalPath };

// 타입
export type { ConstructionTask, Milestone, Dependency, CPData, TaskData };
export type { AnchorDependency, DataService, GanttData };  // 🆕

// 상수
export { GANTT_COLORS, GANTT_LAYOUT, ZOOM_CONFIG };
export { GANTT_ANCHOR, GANTT_DRAG, GANTT_SUMMARY, GANTT_STROKE };  // 🆕

// 데이터 서비스 (🆕)
export { LocalStorageService, createLocalStorageService };
export { StorageQuotaExceededError };  // 할당량 초과 에러 🆕
export { serializeGanttDataForExport, parseImportedData };
```

---

## 🖥️ 화면 구성

### 전체 레이아웃

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              GanttHeader (toolbar)                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────────────────────────────────────┐ ┌────────┐ │
│  │ ← MASTER│ │  ZOOM   │ │  + Task  + CP  + Milestone  ↓ Today     │ │  Save  │ │
│  │ /DETAIL │ │ D/W/M   │ │  Collapse All   Expand All              │ │ Export │ │
│  └─────────┘ └─────────┘ └─────────────────────────────────────────┘ └────────┘ │
├─────────────────────────────┬───────────────────────────────────────────────────┤
│      GanttSidebar           │                  GanttTimeline                    │
│  ┌─────────────────────────┐│  ┌─────────────────────────────────────────────┐  │
│  │     SidebarHeader       ││  │              TimelineHeader                 │  │
│  │  Name │ Start │ End │...││  │   2024.01    │   2024.02   │  2024.03 ...   │  │
│  ├─────────────────────────┤│  │   1 2 3 4... │  1 2 3 4... │  1 2 3 4 ...   │  │
│  │ ㅇ 착공                  ││  │──◆──────────────────────────────────────────│  │
│  │                         ││  │  Milestone Lane                             │  │
│  ├─────────────────────────┤│  ├─────────────────────────────────────────────┤  │
│  │ ▼ 지하골조공사            ││  │  ████████████████████████████               │  │ 
│  │   ├─ 터파기              ││  │  ░░▓▓▓▓████▓▓░░                             │  │
│  │   ├─ 지하기초공사         ││  │      ░░▓▓▓▓████▓▓░░                         │  │
│  │   └─ 골조직영공사         ││  │              ░░████████████░░               │  │
│  │ ▼ 지상골조공사            ││  │                        ████████████████     │  │
│  │   ├─ 지상1~5층           ││  │                        ░░██████████░░       │  │
│  │   └─ 지상6~10층          ││  │                                ████████     │  │
│  └─────────────────────────┘│  └─────────────────────────────────────────────┘  │
│       ↕ Resize Handle       │                                                   │
├─────────────────────────────┴───────────────────────────────────────────────────┤
│                            CriticalPathBar (Detail View Only)                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ CP: 지하골조공사  │  작업일: 60  │  비작업일: 31  │  종합기간: 91일               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘

범례:  ████ 순작업일(Net Work)  ░░ 선간접작업일  ▓▓ 후간접작업일  ◆ 마일스톤
```

### Master View (공구공정표)

```
┌──────────────────────────────────────────────────────────────────┐
│  Sidebar (Level 1)              │  Timeline                      │
├─────────────────────────────────┼────────────────────────────────┤
│  GROUP: 공구 분류                │                                │
│  ├─ CP: Critical Path 1         │  ████████████████████████      │
│  ├─ CP: Critical Path 2         │       ████████████████████     │
│  └─ CP: Critical Path 3         │            ██████████████████  │
│                                 │                                │
│  • CP 더블클릭 → Detail View     │  • CP Bar = 전체 기간 표시       │
│  • GROUP 접기/펼치기 가능         │  • 작업일/비작업일 집계           │
└─────────────────────────────────┴────────────────────────────────┘
```

### Detail View (주공정표)

```
┌──────────────────────────────────────────────────────────────────┐
│  Sidebar (Level 2)              │  Timeline                      │
├─────────────────────────────────┼────────────────────────────────┤
│  [← Master] CP: 지하골조공사      │                                │
│  ├─ GROUP: 토공사                │  ████████████████              │
│  │   ├─ TASK: 터파기             │  ░░▓▓▓██████▓▓░░               │
│  │   └─ TASK: 되메우기           │       ░░██████░░               │
│  └─ GROUP: 구조공사              │        ████████████████        │
│      ├─ TASK: 기초               │        ░░████████░░            │
│      └─ TASK: 지하1층            │            ░░████████░░        │
│                                 │                                │
│  • 드래그로 태스크 이동/리사이즈│  • 앵커로 종속성 연결          │
│  • 인라인 편집 (일수, 이름)     │  • 연결된 태스크 그룹 드래그   │
└─────────────────────────────────┴────────────────────────────────┘
```

### 앵커 종속성 시스템

```
                    TaskBar A                           TaskBar B
   ┌─────────────────────────────────────┐    ┌─────────────────────────────────┐
   │ ░░│▓▓│██│██│██│██│██│▓▓│░░│         │    │     │░░│▓▓│██│██│██│▓▓│░░│     │
   │   ○  ○  ●  ○  ○  ○  ●  ○  ○         │    │        ○  ●  ○  ○  ○  ○  ○     │
   └─────────────────────────────────────┘    └─────────────────────────────────┘
              Day 3 Anchor ●─────────────────────────────● Day 2 Anchor
                           Dependency Line (Bezier Curve)

   ○ 앵커 포인트 (비활성)     ● 연결된 앵커 (활성)

   • 각 작업일에 앵커 포인트 생성
   • 클릭으로 종속성 연결/삭제
   • 연결된 태스크는 그룹으로 함께 이동
```

### 컴포넌트 계층 구조

```
GanttChart
├── GanttHeader
│   ├── ViewModeToggle (MASTER/DETAIL)
│   ├── ZoomControl (DAY/WEEK/MONTH)
│   ├── ActionButtons (+Task, +CP, +Milestone)
│   └── SaveControls (Save, Export, Import)
│
├── GanttSidebar
│   ├── SidebarHeader (컬럼 헤더 + 리사이즈)
│   ├── SidebarRowMaster (Master View 행)
│   │   └── DaysInputCell (일수 편집)
│   ├── SidebarRowDetail (Detail View 행)
│   │   └── DaysInputCell (일수 편집)
│   ├── GanttSidebarNewTaskForm
│   ├── GanttSidebarNewCPForm
│   └── GanttSidebarContextMenu
│
├── GanttTimeline
│   ├── TimelineHeader (날짜 헤더)
│   ├── TimelineGrid (배경 그리드)
│   ├── MilestoneMarker (마일스톤)
│   ├── TaskBar / GroupSummaryBar
│   ├── DependencyLines (종속성 선)
│   ├── AnchorPoints (앵커 포인트)
│   ├── CriticalPathBar (CP 요약)
│   └── TimelineContextMenu
│
├── TaskEditModal (태스크 편집 모달)
├── MilestoneEditModal (마일스톤 편집 모달)
└── GanttErrorBoundary (에러 처리)
```

---

## 📁 프로젝트 구조

```
sa-gantt-lib/
├── src/
│   ├── lib/                          # 라이브러리 코드
│   │   ├── components/               # React 컴포넌트
│   │   │   ├── GanttChart/           # 메인 컨테이너 (604줄, -42%)
│   │   │   │   ├── index.tsx         # GanttChart 메인
│   │   │   │   ├── GanttHeader.tsx   # 상단 툴바
│   │   │   │   └── hooks/            # 커스텀 훅 🆕
│   │   │   │       ├── useGanttInit.ts         # 초기화 로직
│   │   │   │       ├── useScrollToDate.ts      # 날짜 스크롤
│   │   │   │       ├── useSidebarResize.ts     # 사이드바 리사이즈
│   │   │   │       ├── useSidebarColumns.ts    # 컬럼 상태 관리 🆕
│   │   │   │       ├── useExpandCollapse.ts    # 펼침/접기 로직 🆕
│   │   │   │       └── useGanttHandlers.ts     # 핸들러 통합 🆕
│   │   │   │
│   │   │   ├── GanttSidebar/         # 사이드바 모듈 (584줄, -23%)
│   │   │   │   ├── index.tsx         # 사이드바 메인
│   │   │   │   ├── SidebarHeader.tsx # 컬럼 헤더
│   │   │   │   ├── SidebarRowMaster.tsx  # Master View 행
│   │   │   │   ├── SidebarRowDetail.tsx  # Detail View 행
│   │   │   │   ├── SidebarRowUnified.tsx # Unified View 행
│   │   │   │   ├── DaysInputCell.tsx     # 일수 편집 셀
│   │   │   │   ├── MilestoneLaneSpacer.tsx # 마일스톤 레인 🆕
│   │   │   │   └── hooks/            # 커스텀 훅
│   │   │   │       ├── useSidebarColumns.ts   # 컬럼 관리
│   │   │   │       ├── useSidebarDragDrop.ts  # 드래그 앤 드롭
│   │   │   │       ├── useMultiSelect.ts      # 다중 선택
│   │   │   │       ├── useClipboard.ts        # 클립보드
│   │   │   │       ├── useInlineEdit.ts       # 인라인 편집
│   │   │   │       └── useSidebarData.ts      # 데이터 계산 🆕
│   │   │   │
│   │   │   ├── GanttTimeline/        # 타임라인 모듈 (1,012줄, -32%)
│   │   │   │   ├── index.tsx         # 타임라인 메인
│   │   │   │   ├── TimelineHeader.tsx    # 날짜 헤더
│   │   │   │   ├── TimelineGrid.tsx      # 배경 그리드
│   │   │   │   ├── TaskBar.tsx           # 태스크 바 (Master)
│   │   │   │   ├── DetailTaskBar.tsx     # 태스크 바 (Detail, 484줄, -16%)
│   │   │   │   ├── AnchorPoints.tsx      # 앵커 포인트
│   │   │   │   ├── DependencyLines.tsx   # 종속성 선
│   │   │   │   ├── MilestoneMarker.tsx   # 마일스톤
│   │   │   │   ├── SvgDefs.tsx           # SVG 정의 (그라데이션 등)
│   │   │   │   ├── TimelineContextMenu.tsx
│   │   │   │   ├── renderers/        # 렌더러 컴포넌트 🆕
│   │   │   │   │   ├── GridLinesRenderer.tsx  # 그리드 라인
│   │   │   │   │   └── types.ts
│   │   │   │   └── hooks/            # 드래그 훅들
│   │   │   │       ├── useBarDrag.ts     # 바 드래그
│   │   │   │       ├── useGroupDrag.ts   # 그룹 드래그
│   │   │   │       ├── useMilestoneDrag.ts
│   │   │   │       ├── useDependencyDrag.ts  # 종속성 드래그
│   │   │   │       ├── useAnchorConnection.ts
│   │   │   │       ├── useTimelineCore.ts    # 타임라인 코어 로직 🆕
│   │   │   │       ├── useHoverZone.ts       # 호버 영역 감지 🆕
│   │   │   │       ├── useEffectiveDates.ts  # 날짜 계산 🆕
│   │   │   │       └── dragStrategies/   # 드래그 전략 패턴 🆕
│   │   │   │           ├── index.ts
│   │   │   │           ├── moveStrategy.ts
│   │   │   │           ├── moveNetStrategy.ts
│   │   │   │           ├── resizePreStrategy.ts
│   │   │   │           ├── resizePostStrategy.ts
│   │   │   │           └── boundaryStrategy.ts
│   │   │   │
│   │   │   ├── CriticalPathBar.tsx   # CP 요약 바
│   │   │   ├── GroupSummaryBar.tsx   # 그룹 요약 바
│   │   │   ├── TaskEditModal.tsx     # 태스크 편집 모달
│   │   │   ├── MilestoneEditModal.tsx    # 마일스톤 편집 모달
│   │   │   ├── ThemeToggle.tsx       # 테마 토글
│   │   │   └── GanttErrorBoundary.tsx
│   │   │
│   │   ├── hooks/                    # 공용 커스텀 훅
│   │   │   ├── useGanttVirtualization.ts # 가상 스크롤
│   │   │   ├── useKeyboardNavigation.ts  # 키보드 네비게이션
│   │   │   ├── useTaskFocus.ts           # 태스크 포커스
│   │   │   ├── useHistory.ts             # Undo/Redo
│   │   │   └── useColumnResizer.ts
│   │   │
│   │   ├── store/                    # Zustand 스토어
│   │   │   └── useGanttStore.ts      # 전역 상태 관리
│   │   │
│   │   ├── services/                 # 데이터 서비스
│   │   │   ├── DataService.ts        # 서비스 인터페이스
│   │   │   ├── LocalStorageService.ts    # localStorage 구현
│   │   │   ├── serializers.ts        # 직렬화 유틸
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                    # 유틸리티 함수
│   │   │   ├── dateUtils.ts          # 날짜 계산
│   │   │   ├── date/                 # 날짜 모듈 분리
│   │   │   │   ├── conversion.ts     # X↔날짜 변환
│   │   │   │   ├── workingDays.ts    # 작업일 계산
│   │   │   │   ├── holiday.ts        # 휴일 처리
│   │   │   │   ├── koreanHolidays.ts # 한국 공휴일
│   │   │   │   └── dualCalendar.ts   # 이중 캘린더
│   │   │   ├── criticalPath/         # CP 계산 모듈
│   │   │   │   ├── calculator.ts     # CP 계산 로직
│   │   │   │   └── formatter.ts      # 포맷팅
│   │   │   ├── criticalPathUtils.ts  # CP 유틸
│   │   │   ├── dependencyGraph.ts    # 종속성 그래프
│   │   │   ├── groupUtils.ts         # 그룹 유틸
│   │   │   ├── comparisonUtils.ts    # 비교 유틸
│   │   │   └── typeGuards.ts
│   │   │
│   │   ├── context/                  # React Context
│   │   │   ├── GanttContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   │
│   │   ├── types/                    # 타입 정의
│   │   │   ├── index.ts              # 타입 re-export
│   │   │   ├── core.ts               # 핵심 타입 (Task, Dependency 등)
│   │   │   ├── props.ts              # Props 타입
│   │   │   ├── calendar.ts           # 캘린더 타입
│   │   │   ├── ui.ts                 # UI 타입
│   │   │   └── constants.ts          # 상수 정의 (GANTT_LAYOUT 등)
│   │   │
│   │   └── index.ts                  # 라이브러리 진입점
│   │
│   ├── App.tsx                       # 데모 앱
│   ├── main.tsx                      # 엔트리 포인트
│   └── test/                         # 테스트 설정
│       └── setup.ts
│
├── docs/                             # 문서 및 레퍼런스
├── dist/                             # 빌드 출력
├── vite.config.ts                    # Vite 설정
├── tsconfig.json                     # TypeScript 설정
└── package.jsons
```

---

## 🧑‍💻 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 라이브러리 빌드
npm run build

# 테스트 실행
npm run test

# 타입 체크
tsc --noEmit
```

---

## 🗺️ 로드맵

### v0.1.1 (현재)
- [x] 기본 간트 차트 렌더링
- [x] 2단계 뷰 시스템 (Master/Detail)
- [x] 드래그 앤 드롭
- [x] 마일스톤 관리
- [x] Undo/Redo
- [x] 앵커 기반 종속성 시스템
- [x] 연결된 태스크 그룹 드래그
- [x] DataService 추상화 (Supabase 준비)
- [x] 상수 모듈화 (매직 넘버 제거)
- [x] 마일스톤 대시선 연속 렌더링 (Header → Body)
- [x] 그리드 라인 정렬 개선
- [x] useHistory Immer patches 기반 메모리 최적화
- [x] LocalStorage 할당량 초과 에러 처리
- [x] 타입 가드 강화 (serializers)
- [x] **대규모 리팩토링 완료** 🆕
  - 드래그 전략 패턴 (6개 전략 파일)
  - GanttTimeline 32% 감소 (1,490줄 → 1,012줄)
  - GanttChart 42% 감소 (1,041줄 → 604줄)
  - GanttSidebar 23% 감소 (756줄 → 584줄)
  - DetailTaskBar 16% 감소 (577줄 → 484줄)
  - 테스트 커버리지 186개 테스트 통과

### v0.2.0 (진행중)
- [x] Supabase 연동 완료
- [ ] 간트 차트 디버깅 및 안정화
- [ ] UI/UX 기능 개선

### v0.3.0 (예정)
- [ ] 공정계획 입력 탭 기반 자동 스케줄링
- [ ] 종속성 제약 검증

### v1.0.0 (목표)
- [ ] 멀티 프로젝트 지원
- [ ] 리소스 관리
- [ ] 실시간 협업

---

## 📄 라이선스

MIT License © 2024-2025

---
