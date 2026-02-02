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

- **3단계 뷰 시스템**
  - **MASTER View**: 공구공정표 - BLOCK/CP 단위 전체 일정 관리 (Zoom: MONTH)
  - **DETAIL View**: 주공정표 - GROUP/TASK 단위 상세 일정 관리 (Zoom: DAY)
  - **UNIFIED View**: 통합 뷰 - 모든 레벨 동시 표시 (Zoom: WEEK)

- **건설 도메인 특화 날짜 계산**
  - 순작업일 (Net Work): 휴일 제외 실제 작업일 (빨간색)
  - 간접작업일 (Indirect Work): 휴일 포함, 선/후 분리 (파란색)
  - 작업일/비작업일 자동 집계 (Vermilion/Teal)
  - 토요일/일요일/공휴일 개별 작업 설정

- **그룹 종속성 시스템**
  - GROUP 간 FS(Finish-to-Start) 종속성 연결
  - 의존성 그래프 기반 순환 참조 감지
  - Bezier 곡선 시각화

- **태스크 종속성 시스템**
  - FS, SS, FF, SF 종속성 타입 지원
  - 유연한 앵커 포인트 (START, NET_WORK_START, NET_WORK_END, END)
  - Lag 설정 가능

- **고성능 렌더링**
  - @tanstack/react-virtual 기반 가상화 (10,000+ 태스크 지원)
  - React.memo 및 useMemo 최적화
  - 동적 행 높이 지원

- **풍부한 인터랙션**
  - 드래그 앤 드롭 (바 이동, 리사이즈, 다중 선택 드래그)
  - 드래그 전략 패턴 (Move, MoveNet, ResizePre, ResizePost)
  - 줌 레벨 (DAY/WEEK/MONTH)
  - 마일스톤 관리
  - Undo/Redo 지원 (Immer patches 기반 메모리 최적화)
  - 키보드 네비게이션 (Arrow, Ctrl+A, Space, Delete)

- **데이터 서비스 추상화**
  - `DataService` 인터페이스로 저장소 분리
  - `LocalStorageService` 기본 구현
  - Excel 내보내기 (ExcelJS)
  - JSON Import/Export 지원

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
| Zustand | ^5.0.8 | 경량 상태 관리 (UI 상태 전용) |
| Immer | ^11.1.3 | 불변 상태 업데이트 및 Undo/Redo 히스토리 |

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
import { GanttChart, ConstructionTask, Milestone, GroupDependency } from 'sa-gantt-lib';
import 'sa-gantt-lib/style.css';

// Level 1: BLOCK → CP 계층
const tasks: ConstructionTask[] = [
  {
    id: 'block-1',
    parentId: null,
    wbsLevel: 1,
    type: 'BLOCK',
    name: '1공구',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-30'),
    cp: { workDaysTotal: 120, nonWorkDaysTotal: 61 },
    dependencies: [],
    isExpanded: true,
  },
  {
    id: 'cp-1',
    parentId: 'block-1',
    wbsLevel: 1,
    type: 'CP',
    name: '지하골조공사',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-03-31'),
    cp: { workDaysTotal: 60, nonWorkDaysTotal: 31 },
    dependencies: [],
  },
  // Level 2: GROUP → TASK 계층
  {
    id: 'group-1',
    parentId: 'cp-1',
    wbsLevel: 2,
    type: 'GROUP',
    name: '토공사',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-02-15'),
    group: { progress: 0 },
    dependencies: [],
  },
  {
    id: 'task-1',
    parentId: 'group-1',
    wbsLevel: 2,
    type: 'TASK',
    name: '터파기',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    task: {
      netWorkDays: 20,
      indirectWorkDaysPre: 3,
      indirectWorkDaysPost: 2,
    },
    dependencies: [],
  },
];

const milestones: Milestone[] = [
  { id: 'm-1', date: new Date('2025-01-01'), name: '착공' },
  { id: 'm-2', date: new Date('2025-12-31'), name: '준공' },
];

// 그룹 간 종속성
const groupDependencies: GroupDependency[] = [
  { id: 'gd-1', sourceGroupId: 'group-1', targetGroupId: 'group-2', type: 'FS', lag: 0 },
];

function App() {
  const handleTaskUpdate = (task: ConstructionTask) => {
    // 외부 상태 관리 (React Query, Zustand 등)에서 업데이트 처리
    console.log('Task updated:', task);
  };

  return (
    <GanttChart
      tasks={tasks}
      milestones={milestones}
      groupDependencies={groupDependencies}
      onTaskUpdate={handleTaskUpdate}
      onTaskCreate={(task) => console.log('Create:', task)}
      onTaskDelete={(id) => console.log('Delete:', id)}
      initialView="MASTER"      // 'MASTER' | 'DETAIL' | 'UNIFIED'
      initialZoomLevel="WEEK"   // 'DAY' | 'WEEK' | 'MONTH'
    />
  );
}
```

---

## 📖 API 참조

### GanttChart Props

#### 데이터 Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tasks` | `ConstructionTask[]` | ✅ | 작업 목록 |
| `milestones` | `Milestone[]` | - | 마일스톤 목록 |
| `holidays` | `Date[]` | - | 휴일 목록 |
| `calendarSettings` | `CalendarSettings` | - | 캘린더 설정 (토/일/공휴일 작업 여부) |
| `groupDependencies` | `GroupDependency[]` | - | 그룹 간 종속성 목록 |

#### 초기화 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialView` | `'MASTER' \| 'DETAIL' \| 'UNIFIED'` | `'MASTER'` | 초기 뷰 모드 |
| `initialZoomLevel` | `'DAY' \| 'WEEK' \| 'MONTH'` | `'WEEK'` | 초기 줌 레벨 |
| `initialExpandedIds` | `string[]` | - | 초기 펼침 상태 태스크 ID 목록 |

#### 태스크 콜백 Props

| Prop | Type | Description |
|------|------|-------------|
| `onTaskUpdate` | `(task: ConstructionTask) => void` | 작업 수정 시 |
| `onTaskCreate` | `(task: Partial<ConstructionTask>) => void` | 작업 생성 시 |
| `onTaskDelete` | `(taskId: string) => void` | 작업 삭제 시 |
| `onTaskReorder` | `(taskId: string, newIndex: number) => void` | 작업 순서 변경 시 |
| `onTaskMove` | `(taskId: string, targetId: string, position: DropPosition) => void` | 작업 이동 시 |
| `onTaskGroup` | `(taskIds: string[]) => void` | 작업 그룹화 시 |
| `onTaskUngroup` | `(groupId: string) => void` | 그룹 해제 시 |
| `onTaskBlockify` | `(taskIds: string[]) => void` | BLOCK으로 변환 시 |
| `onGroupDrag` | `(result: GroupDragResult) => void` | 그룹 드래그 시 |

#### 그룹 종속성 콜백 Props

| Prop | Type | Description |
|------|------|-------------|
| `onGroupDependencyCreate` | `(dep: GroupDependency) => void` | 그룹 종속성 생성 시 |
| `onGroupDependencyDelete` | `(depId: string) => void` | 그룹 종속성 삭제 시 |
| `onGroupCycleDetected` | `(info: CycleInfo) => void` | 순환 참조 감지 시 |

#### 마일스톤 콜백 Props

| Prop | Type | Description |
|------|------|-------------|
| `onMilestoneCreate` | `(milestone: Partial<Milestone>) => void` | 마일스톤 생성 시 |
| `onMilestoneUpdate` | `(milestone: Milestone) => void` | 마일스톤 수정 시 |
| `onMilestoneDelete` | `(milestoneId: string) => void` | 마일스톤 삭제 시 |

#### 데이터 I/O Props

| Prop | Type | Description |
|------|------|-------------|
| `onSave` | `() => void` | 저장 버튼 클릭 시 |
| `onReset` | `() => void` | 초기화 버튼 클릭 시 |
| `onExport` | `() => void` | JSON 내보내기 시 |
| `onExportExcel` | `() => void` | Excel 내보내기 시 |
| `onImport` | `(file: File) => void` | 파일 가져오기 시 |
| `hasUnsavedChanges` | `boolean` | 저장되지 않은 변경사항 여부 |
| `saveStatus` | `'idle' \| 'saving' \| 'saved'` | 저장 상태 표시 |
| `loadedFileName` | `string \| null` | 로드된 파일명 표시 |

#### 기타 Props

| Prop | Type | Description |
|------|------|-------------|
| `onError` | `(error: Error, context: GanttErrorContext) => void` | 에러 발생 시 |
| `className` | `string` | 추가 CSS 클래스 |
| `style` | `React.CSSProperties` | 인라인 스타일 |

### 핵심 타입

```typescript
// TaskType 계층
type TaskType = 'BLOCK' | 'CP' | 'GROUP' | 'TASK';
//  BLOCK (공구) ─ Level 1 최상위 컨테이너
//  CP (Critical Path) ─ Level 1 집계
//  GROUP (그룹) ─ Level 2 그룹
//  TASK (작업) ─ Level 2 개별 작업

// 작업 데이터
interface ConstructionTask {
  id: string;
  parentId: string | null;
  wbsLevel: 1 | 2;
  type: TaskType;
  name: string;
  startDate: Date;
  endDate: Date;
  cp?: CPData;         // Level 1 전용 (BLOCK, CP)
  task?: TaskData;     // Level 2 전용 (TASK)
  group?: GroupData;   // GROUP 전용
  dependencies: Dependency[];
  isExpanded?: boolean;
}

// Level 1 데이터 (공구공정표)
interface CPData {
  workDaysTotal: number;      // 작업일수 (Vermilion 색상)
  nonWorkDaysTotal: number;   // 비작업일수 (Teal 색상)
}

// Level 2 데이터 (주공정표)
interface TaskData {
  netWorkDays: number;           // 순작업일 (Red)
  indirectWorkDaysPre: number;   // 선간접작업일 (Blue, 왼쪽)
  indirectWorkDaysPost: number;  // 후간접작업일 (Blue, 오른쪽)
  workOnSaturdays?: boolean;     // 토요일 작업 여부
  workOnSundays?: boolean;       // 일요일 작업 여부
  workOnHolidays?: boolean;      // 공휴일 작업 여부
  quantity?: number;             // 물량
  unit?: string;                 // 단위 (㎥, 본, ton, ㎡ 등)
  dailyOutput?: number;          // 일일 생산량
  crew?: number;                 // 투입 인력
}

// GROUP 데이터
interface GroupData {
  progress: number;  // 진행률 (0-100)
}

// 종속성 (태스크 간)
interface Dependency {
  id: string;
  predecessorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag?: number;
  sourceAnchor?: 'START' | 'NET_WORK_START' | 'NET_WORK_END' | 'END';
  targetAnchor?: 'START' | 'NET_WORK_START' | 'NET_WORK_END' | 'END';
}

// 그룹 종속성 (GROUP 간)
interface GroupDependency {
  id: string;
  sourceGroupId: string;
  targetGroupId: string;
  type: 'FS';
  lag?: number;
}

// 마일스톤
interface Milestone {
  id: string;
  date: Date;
  name: string;
  description?: string;
}

// 뷰 모드
type ViewMode = 'MASTER' | 'DETAIL' | 'UNIFIED';
type ZoomLevel = 'DAY' | 'WEEK' | 'MONTH';
```

### Exports

```typescript
// ═══════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════
export { GanttChart };              // 메인 컴포넌트
export { GanttSidebar };            // 사이드바
export { GanttTimeline };           // 타임라인
export { TaskEditModal };           // 태스크 편집 모달
export { MilestoneEditModal };      // 마일스톤 편집 모달
export { GanttErrorBoundary };      // 에러 바운더리
export { ThemeToggle, ThemeToggleGroup };  // 테마 토글

// ═══════════════════════════════════════════════════════════════════
// 스토어 훅 (Zustand - UI 상태 전용)
// ═══════════════════════════════════════════════════════════════════
export { useGanttStore };           // 전체 스토어
export { useGanttViewState, useGanttViewActions };  // 뷰 상태
export { useGanttSelection };       // 선택 상태
export { useGanttExpansion };       // 펼침/접기 상태
export { useGanttSidebar };         // 사이드바 상태
export { useGanttDrag };            // 드래그 상태

// ═══════════════════════════════════════════════════════════════════
// 커스텀 훅
// ═══════════════════════════════════════════════════════════════════
export { useGanttVirtualization };  // 가상 스크롤
export { useKeyboardNavigation };   // 키보드 네비게이션
export { useTaskFocus };            // 태스크 포커스
export { useHistory };              // Undo/Redo
export { useColumnResizer };        // 컬럼 리사이즈
export { useGanttMultiDrag };       // 다중 선택 드래그

// ═══════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════
export { GanttContext, GanttProvider, useGanttContext };
export { ThemeContext, ThemeProvider, useTheme, useThemeSafe };

// ═══════════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════════
// 날짜
export { dateToX, xToDate };                    // X좌표 ↔ 날짜 변환
export { addWorkingDays, subtractWorkingDays }; // 작업일 계산
export { isHoliday, isWeekend, snapToWorkingDay };
export { getKoreanHolidays };                   // 한국 공휴일 (2025-2027)

// Critical Path
export { calculateCriticalPathSummary };
export { formatCriticalPathSummary };

// 의존성 그래프
export { buildGroupDependencyGraph, detectCycle };

// 계층 검증
export { canBeChildOf, canBeSiblingOf, canMoveTaskTo };

// 타입 가드
export { isTaskWithDetails, isBlockTask, isCPTask, isGroupTask };

// ═══════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════
export type { ConstructionTask, TaskType };
export type { Milestone };
export type { Dependency, DependencyType, AnchorPoint };
export type { GroupDependency };
export type { CPData, TaskData, GroupData };
export type { ViewMode, ZoomLevel };
export type { CalendarSettings };
export type { GanttChartProps };
export type { DataService, GanttData };
export type { BarDragResult, GroupDragResult, DropPosition };

// ═══════════════════════════════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════════════════════════════
export { GANTT_COLORS, GANTT_COLORS_STATIC };   // 색상 (CSS 변수 / 정적)
export { GANTT_LAYOUT };                        // 레이아웃 (ROW_HEIGHT, BAR_HEIGHT 등)
export { ZOOM_CONFIG };                         // 줌 설정 (pixelsPerDay)
export { GANTT_ANCHOR, GANTT_DRAG };            // 앵커/드래그 상수
export { GANTT_SUMMARY, GANTT_STROKE };         // 요약/선 상수

// ═══════════════════════════════════════════════════════════════════
// 데이터 서비스
// ═══════════════════════════════════════════════════════════════════
export { LocalStorageService, createLocalStorageService };
export { StorageQuotaExceededError };
export { serializeGanttDataForExport, parseImportedData };
export { exportToExcel };                       // Excel 내보내기
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

### 그룹 종속성 시스템

```
         GROUP A                                GROUP B
   ┌─────────────────┐                    ┌─────────────────┐
   │ ████████████████ │────────FS────────→│ ████████████████ │
   └─────────────────┘                    └─────────────────┘
                          Bezier Curve

   • GROUP 간 FS(Finish-to-Start) 종속성
   • 순환 참조 자동 감지 (DFS 기반)
   • Lag 설정으로 간격 조정 가능
```

### 태스크 종속성 앵커

```
                 TASK Bar (Detail View)
   ┌───────────────────────────────────────────────┐
   │ ░░░│▓▓▓│███│███│███│███│███│▓▓▓│░░░│         │
   │  ↑    ↑                         ↑    ↑       │
   │ START NET_WORK_START    NET_WORK_END  END    │
   └───────────────────────────────────────────────┘

   앵커 타입:
   • START         : 전체 시작점 (간접작업일 포함)
   • NET_WORK_START: 순작업 시작점
   • NET_WORK_END  : 순작업 종료점
   • END           : 전체 종료점 (간접작업일 포함)

   종속성 타입:
   • FS (Finish-to-Start): 선행 완료 후 후행 시작
   • SS (Start-to-Start) : 선행 시작 시 후행 시작
   • FF (Finish-to-Finish): 선행 완료 시 후행 완료
   • SF (Start-to-Finish) : 선행 시작 시 후행 완료
```

### 컴포넌트 계층 구조

```
GanttChart (메인 컨테이너)
├── GanttProvider (Context Wrapper)
│
├── GanttHeader (상단 툴바)
│   ├── ViewModeToggle (MASTER/DETAIL/UNIFIED)
│   ├── ZoomControl (DAY/WEEK/MONTH)
│   ├── ActionButtons (+Task, +CP, +Milestone, ↓Today)
│   ├── ExpandCollapseButtons (전체 펼침/접기)
│   └── SaveControls (Save, Export, Import, Reset)
│
├── GanttSidebar (사이드바)
│   ├── SidebarHeader (컬럼 헤더 + 리사이즈)
│   ├── SidebarRowMaster (Level 1 행 - BLOCK/CP)
│   ├── SidebarRowDetail (Level 2 행 - GROUP/TASK)
│   ├── SidebarRowUnified (통합 뷰 행)
│   ├── DaysInputCell (일수 편집 셀)
│   ├── MilestoneLaneSpacer (마일스톤 레인 간격)
│   ├── GanttSidebarNewTaskForm (새 태스크 폼)
│   ├── GanttSidebarNewCPForm (새 CP 폼)
│   └── GanttSidebarContextMenu (우클릭 메뉴)
│
├── GanttTimeline (타임라인)
│   ├── TimelineHeader (날짜 헤더)
│   ├── TimelineGrid (배경 그리드)
│   │   └── GridLinesRenderer (그리드 라인 렌더러)
│   ├── SvgDefs (SVG 정의 - 그라데이션 등)
│   │
│   ├── MilestoneMarker (마일스톤 마커)
│   │
│   ├── [Level 1 바]
│   │   ├── MasterTaskBar (Master View)
│   │   ├── BlockBar (BLOCK 컨테이너)
│   │   ├── CriticalPathBar (CP 바)
│   │   └── WorkDaysRatioBar (작업일/비작업일 비율)
│   │
│   ├── [Level 2 바]
│   │   ├── DetailTaskBar (TASK 바)
│   │   └── GroupSummaryBar (GROUP 집계 바)
│   │
│   ├── GroupDependencyLines (그룹 종속성 선 - Bezier)
│   │
│   └── TimelineContextMenu (우클릭 메뉴)
│
├── TaskEditModal (태스크 편집 모달)
├── MilestoneEditModal (마일스톤 편집 모달)
├── ThemeToggle (테마 전환)
└── GanttErrorBoundary (에러 바운더리)
```

---

## 🏗️ 아키텍처

### 상태 관리 설계

```
┌─────────────────────────────────────────────────────────────────────┐
│                         외부 (앱 레벨)                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ React Query / Supabase / 외부 상태 관리                        │  │
│  │  • tasks, milestones, groupDependencies (데이터)              │  │
│  │  • 서버 동기화, 캐싱, 낙관적 업데이트                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ↓ props                                │
├─────────────────────────────────────────────────────────────────────┤
│                       GanttChart (라이브러리)                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Zustand Store (UI 상태 전용)                                   │  │
│  │  • viewMode, zoomLevel, activeCPId                            │  │
│  │  • selectedTaskIds, focusedTaskId, expandedTaskIds            │  │
│  │  • sidebarWidth, isDragging, dragType                         │  │
│  │  • isCompactMode                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ GanttContext (설정/콜백 공유)                                   │  │
│  │  • viewMode, activeCPId, holidays, calendarSettings           │  │
│  │  • onTaskUpdate, onTaskCreate, onTaskDelete, ...              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ ThemeContext (테마)                                            │  │
│  │  • theme: 'light' | 'dark'                                    │  │
│  │  • toggleTheme()                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

핵심 원칙:
• 데이터는 props로 전달 (외부 관리)
• UI 상태만 Zustand로 관리
• 콜백으로 데이터 변경 요청 → 외부에서 처리
```

### 드래그 전략 패턴

```typescript
// dragStrategies/ 디렉토리
interface DragStrategy {
  calculateNewDates(params: DragParams): DateResult;
  validate(params: DragParams): boolean;
}

// 구현된 전략들
├── moveStrategy.ts       // 전체 태스크 이동
├── moveNetStrategy.ts    // 순작업 구간만 이동
├── resizePreStrategy.ts  // 선간접작업 리사이즈
├── resizePostStrategy.ts // 후간접작업 리사이즈
└── boundaryStrategy.ts   // 경계 제약 조건
```

---

## 📁 프로젝트 구조

```
sa-gantt-lib/
├── src/
│   ├── lib/                          # 라이브러리 코드 (~128 TS 파일)
│   │   │
│   │   ├── components/               # React 컴포넌트 (~3,600줄)
│   │   │   ├── GanttChart/           # 메인 컨테이너
│   │   │   │   ├── index.tsx
│   │   │   │   ├── GanttHeader.tsx
│   │   │   │   └── hooks/            # useGanttInit, useScrollToDate 등
│   │   │   │
│   │   │   ├── GanttSidebar/         # 사이드바
│   │   │   │   ├── index.tsx, SidebarHeader.tsx
│   │   │   │   ├── SidebarRow[Master|Detail|Unified].tsx
│   │   │   │   ├── GanttSidebarContextMenu.tsx
│   │   │   │   ├── forms/            # 통합 폼 컴포넌트
│   │   │   │   │   ├── BaseTaskForm.tsx
│   │   │   │   │   ├── formConfigs.ts
│   │   │   │   │   └── types.ts
│   │   │   │   └── hooks/
│   │   │   │       ├── useSidebarDragDrop, useMultiSelect
│   │   │   │       └── useSidebarRowStyle  # 공통 스타일 훅
│   │   │   │
│   │   │   ├── GanttTimeline/        # 타임라인
│   │   │   │   ├── index.tsx, TimelineHeader.tsx, TimelineGrid.tsx
│   │   │   │   ├── [Master|Detail]TaskBar.tsx
│   │   │   │   ├── GroupSummaryBar.tsx, MilestoneMarker.tsx
│   │   │   │   ├── GroupDependencyLines.tsx
│   │   │   │   ├── renderers/        # 통합 렌더러 모듈
│   │   │   │   │   ├── TaskBarsRenderer.tsx
│   │   │   │   │   ├── TaskLabelsRenderer.tsx
│   │   │   │   │   ├── MilestoneDashLinesRenderer.tsx
│   │   │   │   │   └── GridLinesRenderer.tsx
│   │   │   │   └── hooks/
│   │   │   │       ├── useBarDrag, useGroupDrag, useMilestoneDrag
│   │   │   │       └── dragStrategies/
│   │   │   │           ├── utils/       # 모듈화된 드래그 유틸
│   │   │   │           │   ├── dragCalculations.ts
│   │   │   │           │   ├── holidaySnap.ts
│   │   │   │           │   ├── groupDragUtils.ts
│   │   │   │           │   └── criticalPathUtils.ts
│   │   │   │           └── [move, resize 전략 패턴]
│   │   │   │
│   │   │   └── [기타 컴포넌트]        # Modal, ErrorBoundary, ThemeToggle
│   │   │
│   │   ├── hooks/                    # 공용 훅 (5개)
│   │   │   ├── useGanttVirtualization.ts
│   │   │   ├── useKeyboardNavigation.ts
│   │   │   ├── useTaskFocus.ts
│   │   │   ├── useHistory.ts
│   │   │   └── useColumnResizer.ts
│   │   │
│   │   ├── store/                    # Zustand (UI 상태 전용)
│   │   │   └── useGanttStore.ts
│   │   │
│   │   ├── services/                 # 데이터 서비스 추상화
│   │   │   ├── DataService.ts        # 인터페이스
│   │   │   ├── LocalStorageService.ts
│   │   │   ├── excelExportService.ts
│   │   │   └── serializers.ts
│   │   │
│   │   ├── utils/                    # 유틸리티
│   │   │   ├── date/                 # 날짜 계산 모듈
│   │   │   │   ├── conversion.ts, workingDays.ts, holiday.ts
│   │   │   │   ├── koreanHolidays.ts # 2025-2027 공휴일
│   │   │   │   └── dualCalendar.ts
│   │   │   ├── criticalPath/         # CP 계산
│   │   │   ├── dependencyGraph.ts    # 의존성 그래프 + 순환 감지
│   │   │   ├── hierarchyValidation.ts
│   │   │   ├── migration.ts          # 데이터 마이그레이션
│   │   │   └── typeGuards.ts
│   │   │
│   │   ├── context/                  # React Context
│   │   │   ├── GanttContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   │
│   │   ├── types/                    # 타입 정의 (7개 파일)
│   │   │   ├── core.ts, props.ts, calendar.ts, ui.ts, constants.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── style.css                 # Tailwind + 커스텀 스타일
│   │   └── index.ts                  # 라이브러리 진입점
│   │
│   ├── App.tsx                       # 데모 앱
│   └── main.tsx
│
├── dist/                             # 빌드 출력
│   ├── index.es.js                   # ES Module
│   ├── index.umd.js                  # UMD
│   ├── index.d.ts                    # TypeScript 선언
│   └── style.css
│
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
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

# 데모 빌드 (dist-demo/)
DEMO=true npm run build:demo

# 테스트 실행
npm run test

# 테스트 커버리지
npm run test:coverage

# 타입 체크
tsc --noEmit
```

### 테스트 구조 (9개 파일, 186개 테스트)

```
src/lib/
├── utils/__tests__/
│   ├── dateUtils.test.ts          # 날짜 유틸리티 (15 tests)
│   ├── criticalPathUtils.test.ts  # CP 계산 (7 tests)
│   ├── dependencyGraph.test.ts    # 의존성 그래프 (10 tests)
│   ├── groupUtils.test.ts         # 그룹 유틸 (7 tests)
│   ├── typeGuards.test.ts         # 타입 가드 (35 tests)
│   ├── validation.test.ts         # 검증 로직 (16 tests)
│   └── comparisonUtils.test.ts    # 비교 유틸 (35 tests)
│
├── components/GanttTimeline/hooks/__tests__/
│   └── dragUtils.test.ts          # 드래그 유틸리티 (29 tests)
│                                  # - calculateDragDirection, calculateDeltaDays
│                                  # - getDragCursor, calculateHolidaySnap
│                                  # - calculateWorkingDaysOffsets, calculateTaskMoveResult
│
└── store/__tests__/
    └── useGanttStore.test.ts      # Zustand 스토어 (32 tests)
```

---

## 🗺️ 로드맵

### v0.1.x (현재)

#### 핵심 기능
- [x] 기본 간트 차트 렌더링
- [x] 3단계 뷰 시스템 (MASTER/DETAIL/UNIFIED)
- [x] 4가지 TaskType (BLOCK/CP/GROUP/TASK)
- [x] 드래그 앤 드롭 (이동, 리사이즈, 다중 선택)
- [x] 마일스톤 관리
- [x] Undo/Redo (Immer patches 기반 메모리 최적화)

#### 종속성 시스템
- [x] 그룹 종속성 (GROUP 간 FS 연결)
- [x] 태스크 종속성 (FS/SS/FF/SF + 앵커 포인트)
- [x] 순환 참조 감지 (DFS 기반)

#### 성능 최적화
- [x] @tanstack/react-virtual 가상 스크롤 (10K+ 지원)
- [x] 드래그 전략 패턴 분리

#### 데이터 서비스
- [x] DataService 추상화 인터페이스
- [x] LocalStorageService 구현
- [x] Excel 내보내기 (ExcelJS)
- [x] JSON Import/Export
- [x] 타입 가드 강화

#### 코드 품질
- [x] 대규모 리팩토링 완료 (2026.02)
  - Form 컴포넌트 통합: 984줄 → ~400줄 (60% 감소)
  - GanttTimeline 렌더러 통합: 915줄 → 703줄 + 통합 렌더러
  - dragUtils 모듈화: 517줄 → 4개 포커스된 모듈
  - SidebarRow 스타일 훅 추출 (useSidebarRowStyle)
- [x] 상수 모듈화 (매직 넘버 제거)
- [x] 9개 테스트 파일, 186개 테스트 케이스

### v0.2.0 (진행 중)
- [x] Supabase 연동 준비
- [ ] 간트 차트 디버깅 및 안정화
- [ ] UI/UX 기능 개선
- [ ] Compact Mode 완성

### v0.3.0 (예정)
- [ ] 공정계획 입력 탭 기반 자동 스케줄링
- [ ] 종속성 제약 검증 강화
- [ ] 접근성 개선 (스크린 리더)

### v1.0.0 (목표)
- [ ] 멀티 프로젝트 지원
- [ ] 리소스 관리 (인력, 장비)
- [ ] 실시간 협업 (WebSocket)
- [ ] 성능 모니터링/텔레메트리

---

## 📄 라이선스

MIT License © 2024-2026

---

## 📚 추가 정보

### 한국 공휴일 지원

`koreanHolidays.ts`에 2025-2027년 한국 공휴일 데이터가 포함되어 있습니다:
- 신정, 설날, 삼일절, 어린이날, 부처님오신날
- 현충일, 광복절, 추석, 개천절, 한글날, 성탄절
- 대체공휴일 자동 적용

### Path Aliases (tsconfig.json)

```json
{
  "paths": {
    "@/*": ["./src/lib/*"],
    "@/components/*": ["./src/lib/components/*"],
    "@/hooks/*": ["./src/lib/hooks/*"],
    "@/utils/*": ["./src/lib/utils/*"],
    "@/types/*": ["./src/lib/types/*"],
    "@/store/*": ["./src/lib/store/*"],
    "@/context/*": ["./src/lib/context/*"],
    "@/services/*": ["./src/lib/services/*"]
  }
}
```

---
