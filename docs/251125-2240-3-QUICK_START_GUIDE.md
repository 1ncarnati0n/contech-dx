# 🚀 즉시 시작 가이드: Gantt Chart 리팩토링

**목적**: 현재 에러를 해결하고 핵심 Gantt 기능을 개선하기 위한 즉시 실행 가능한 작업 가이드

---

## ⚡ 우선순위 1: 에러 해결 (30분)

### 작업 1-1: GanttChartPageClient Props 수정

**파일**: `src/components/projects/GanttChartPageClient.tsx`

**현재 문제**: 서버에서 `initialTasks`, `initialLinks`를 전달하지 않아 타입 에러 발생

**수정**:
```typescript
// ❌ Before
interface Props {
  project: Project;
  ganttChart: GanttChart;
  initialTasks: Task[];
  initialLinks: GanttLink[];
}

export function GanttChartPageClient({
  project,
  ganttChart,
  initialTasks,
  initialLinks,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [links, setLinks] = useState<GanttLink[]>(initialLinks);
  // ...
}

// ✅ After
interface Props {
  project: Project;
  ganttChart: GanttChart;
}

export function GanttChartPageClient({
  project,
  ganttChart,
}: Props) {
  // 데이터는 GanttWrapper 내부의 useGanttSchedule에서 로딩
  // 별도 상태 관리 불필요
  
  // ...
}
```

**완료 후**: TypeScript 에러 해결, 페이지 접근 가능

---

### 작업 1-2: 불필요한 통계 섹션 제거

**파일**: `src/components/projects/GanttChartPageClient.tsx`

**문제**: Tasks/Links 데이터가 없어서 통계를 표시할 수 없음

**수정**: 통계 카드 섹션 전체 제거 (라인 85-116)

```typescript
// ❌ Before: 통계 섹션 (제거)
{/* Stats */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Card className="p-4 text-center">
    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
      {tasks.length}
    </div>
    {/* ... */}
  </Card>
  {/* ... */}
</div>

// ✅ After: 간결한 레이아웃
return (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div>
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {project.name}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {ganttChart.name}
        </h1>
        {ganttChart.description && (
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {ganttChart.description}
          </p>
        )}
      </div>
    </div>

    {/* Gantt Chart */}
    <Card className="p-0 overflow-hidden">
      <div className="h-[calc(100vh-300px)] min-h-[600px]">
        <GanttWrapper
          ganttChartId={ganttChart.id}
          onGanttReady={(api) => {
            console.log('✅ Gantt API Ready:', api);
          }}
        />
      </div>
    </Card>
  </div>
);
```

**완료 후**: 깔끔한 UI, 에러 없이 렌더링

---

## ⚡ 우선순위 2: 초기 데이터 로딩 개선 (1시간)

### 작업 2-1: useGanttData 초기 상태 수정

**파일**: `src/lib/gantt/hooks/useGanttData.ts`

**문제**: `schedule`의 초기값이 `null`이어서 로딩 중 에러 발생 가능

**수정**:
```typescript
// ❌ Before
const [schedule, setSchedule] = useState<Schedule | null>(null);

// ✅ After
const EMPTY_SCHEDULE: Schedule = {
  tasks: [],
  links: [],
  scales: [
    { unit: "month" as const, step: 1, format: "M월" },
    { unit: "day" as const, step: 1, format: "d" },
  ],
};

const [schedule, setSchedule] = useState<Schedule>(EMPTY_SCHEDULE);
```

**파일 상단에 상수 정의 추가**:
```typescript
/**
 * useGanttData Hook
 * Gantt 데이터 로딩, 저장, 동기화를 담당합니다.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { decorateTask } from "../utils/decorators";
import type { Schedule, SaveState, Task, Link, GanttApi } from "../types";
import { getTasks, upsertTasksBatch, deleteTasksBatch } from "@/lib/services/tasks";
import { getLinks, upsertLinksBatch, deleteLinksBatch } from "@/lib/services/links";
import { convertMockTasksToSupabase, convertMockLinksToSupabase } from "../utils/mockDataConverter";

// 빈 스케줄 초기값
const EMPTY_SCHEDULE: Schedule = {
  tasks: [],
  links: [],
  scales: [
    { unit: "month" as const, step: 1, format: "M월" },
    { unit: "day" as const, step: 1, format: "d" },
  ],
};

interface UseGanttDataResult {
  schedule: Schedule; // null 제거
  isLoading: boolean;
  saveState: SaveState;
  hasChanges: boolean;
  handleSave: () => Promise<void>;
  syncFromApi: () => void;
  markAsChanged: () => void;
}
```

**완료 후**: null 에러 완전히 제거, 안정적인 초기 렌더링

---

### 작업 2-2: GanttChart 렌더링 조건 단순화

**파일**: `src/components/gantt/GanttChart.tsx`

**기존 코드** (라인 263):
```typescript
) : schedule && Array.isArray(schedule.tasks) && Array.isArray(schedule.links) ? (
```

**수정** (schedule은 항상 객체이므로 배열 체크만 필요):
```typescript
) : Array.isArray(schedule.tasks) && Array.isArray(schedule.links) ? (
```

**완료 후**: 더 간결한 조건문, 로직 명확화

---

## ⚡ 우선순위 3: Mock 데이터 초기화 (30분)

### 작업 3-1: Mock Gantt Chart 자동 생성

**파일**: `src/lib/services/mockStorage.ts`

**목적**: 프로젝트 페이지 접근 시 자동으로 Mock Gantt Chart 생성

**추가 함수**:
```typescript
/**
 * 프로젝트에 대한 기본 Mock Gantt Chart 초기화
 */
export function initializeMockGanttChart(projectId: string): GanttChart {
  if (!isBrowser) {
    throw new Error('Cannot initialize in non-browser environment');
  }

  const existingCharts = getMockGanttCharts(projectId);
  
  // 이미 차트가 있으면 첫 번째 반환
  if (existingCharts.length > 0) {
    return existingCharts[0];
  }

  // 없으면 새로 생성
  const newChart: GanttChart = {
    id: `mock-chart-${projectId}-1`,
    project_id: projectId,
    name: '기본 공정표',
    description: '프로젝트 기본 Gantt Chart',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const data = localStorage.getItem(STORAGE_KEYS.ganttCharts);
  const all = data ? JSON.parse(data) as GanttChart[] : [];
  all.push(newChart);
  localStorage.setItem(STORAGE_KEYS.ganttCharts, JSON.stringify(all));

  console.log('✅ Mock Gantt Chart auto-created:', newChart.id);
  return newChart;
}
```

**파일 하단에 export 추가**:
```typescript
export {
  getMockGanttCharts,
  getMockGanttChart,
  createMockGanttChart,
  updateMockGanttChart,
  deleteMockGanttChart,
  getMockTasks,
  getMockLinks,
  clearAllMockData,
  initializeMockGanttChart, // 추가
};
```

---

### 작업 3-2: ProjectDetailClient에서 자동 초기화

**파일**: `src/components/projects/ProjectDetailClient.tsx`

**useEffect 추가** (라인 106 이후):
```typescript
import { initializeMockGanttChart } from '@/lib/services/mockStorage';

export function ProjectDetailClient({ project, ganttCharts: initialCharts }: Props) {
  // ... 기존 코드 ...

  // Mock 프로젝트의 경우 Gantt Chart 자동 생성
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Mock 프로젝트이고 차트가 없는 경우
    if (project.id.startsWith('mock-') && ganttCharts.length === 0) {
      try {
        const autoChart = initializeMockGanttChart(project.id);
        setGanttCharts([autoChart]);
        console.log('✅ Auto-initialized Gantt Chart:', autoChart.id);
      } catch (error) {
        console.error('Failed to auto-initialize Gantt Chart:', error);
      }
    }
  }, [project.id, ganttCharts.length]);

  // ... 기존 코드 ...
}
```

**완료 후**: Mock 프로젝트 접근 시 자동으로 간트 차트 생성

---

## ⚡ 우선순위 4: 컴포넌트 분리 시작 (2시간)

### 작업 4-1: GanttChart 폴더 구조 생성

**터미널 실행**:
```bash
cd /Users/1ncarnati0n/Desktop/tsxPJT/contech-dx
mkdir -p src/components/gantt/GanttChart
```

**생성할 파일들**:
```
src/components/gantt/GanttChart/
├── index.tsx                 # 메인 컨테이너
├── GanttCore.tsx             # SVAR Gantt 래퍼
├── GanttToolbar.tsx          # 툴바
├── GanttEditor.tsx           # 에디터
├── hooks/
│   ├── useGanttColumns.ts    # 컬럼 설정
│   └── useGanttScales.ts     # 스케일 설정
└── types.ts                  # 컴포넌트 타입
```

---

### 작업 4-2: useGanttColumns 훅 작성

**파일**: `src/components/gantt/GanttChart/hooks/useGanttColumns.ts`

```typescript
import { useMemo } from 'react';
import { defaultColumns, type IColumnConfig } from '@svar-ui/react-gantt';

const START_COLUMN_WIDTH = 100;

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatDisplayEnd(task: Record<string, any>): string {
  const exclusiveEnd =
    task.end instanceof Date ? task.end : task.end ? new Date(task.end as string) : undefined;
  if (!exclusiveEnd) {
    return '';
  }

  const inclusive = new Date(exclusiveEnd);
  inclusive.setDate(inclusive.getDate() - 1);

  const start =
    task.start instanceof Date ? task.start : task.start ? new Date(task.start as string) : undefined;
  if (start && inclusive < start) {
    return dateFormatter.format(start);
  }

  return dateFormatter.format(inclusive);
}

export function useGanttColumns(): IColumnConfig[] {
  return useMemo<IColumnConfig[]>(() => {
    return defaultColumns.map((column) => {
      if (column.id === 'text') {
        return { ...column, header: '단위공정' };
      }

      if (column.id === 'start') {
        return {
          ...column,
          header: '시작',
          width: START_COLUMN_WIDTH,
          format: 'yyyy-MM-dd',
        };
      }

      if (column.id === 'end') {
        return {
          ...column,
          header: '종료',
          width: START_COLUMN_WIDTH,
          format: 'yyyy-MM-dd',
          template: (_: unknown, task: Record<string, any>) => formatDisplayEnd(task),
        };
      }

      if (column.id === 'duration') {
        return {
          ...column,
          header: 'D',
          width: Math.round(START_COLUMN_WIDTH * 0.45),
        };
      }

      return column;
    });
  }, []);
}
```

---

### 작업 4-3: useGanttScales 훅 작성

**파일**: `src/components/gantt/GanttChart/hooks/useGanttScales.ts`

```typescript
import { useMemo } from 'react';
import type { ViewType } from '../../types';

interface ScaleConfig {
  unit: 'year' | 'month' | 'week' | 'day' | 'hour';
  step: number;
  format: string;
}

const TIME_SCALE_CONFIGS: Record<ViewType, { scales: ScaleConfig[] }> = {
  day: {
    scales: [
      { unit: 'year', step: 1, format: 'yyyy년' },
      { unit: 'month', step: 1, format: 'M월' },
      { unit: 'day', step: 1, format: 'd' },
    ],
  },
  week: {
    scales: [
      { unit: 'year', step: 1, format: 'yyyy년' },
      { unit: 'month', step: 1, format: 'M월' },
      { unit: 'week', step: 1, format: 'w주' },
    ],
  },
  month: {
    scales: [
      { unit: 'year', step: 1, format: 'yyyy년' },
      { unit: 'month', step: 1, format: 'M월' },
    ],
  },
};

export function useGanttScales(viewType: ViewType): ScaleConfig[] {
  return useMemo(() => TIME_SCALE_CONFIGS[viewType].scales, [viewType]);
}
```

---

### 작업 4-4: GanttCore 컴포넌트 작성

**파일**: `src/components/gantt/GanttChart/GanttCore.tsx`

```typescript
'use client';

import { Gantt } from '@svar-ui/react-gantt';
import type { Schedule, GanttApi } from '@/lib/gantt/types';
import type { ViewType } from '../types';
import { useGanttColumns } from './hooks/useGanttColumns';
import { useGanttScales } from './hooks/useGanttScales';
import { useCallback } from 'react';
import { isWeekend, isKoreanHoliday } from '@/data/koreanHolidays';
import { TASK_TYPES, CELL_HEIGHT, CELL_WIDTH_MAP } from '../taskConfig';

interface GanttCoreProps {
  schedule: Schedule;
  viewType: ViewType;
  showBaselines: boolean;
  onApiReady: (api: GanttApi) => void;
}

export function GanttCore({ 
  schedule, 
  viewType, 
  showBaselines,
  onApiReady 
}: GanttCoreProps) {
  const columns = useGanttColumns();
  const scales = useGanttScales(viewType);

  // 주말 및 공휴일 하이라이트 함수
  const highlightTime = useCallback((date: Date, unit: string) => {
    // day 단위일 때만 주말/공휴일 표시
    if (unit === 'day') {
      if (isKoreanHoliday(date)) {
        return 'wx-holiday'; // 공휴일 스타일
      }
      if (isWeekend(date)) {
        return 'wx-weekend'; // 주말 스타일
      }
    }
    return '';
  }, []);

  return (
    <Gantt
      init={onApiReady}
      tasks={schedule.tasks}
      links={schedule.links}
      scales={scales}
      columns={columns}
      taskTypes={TASK_TYPES}
      cellWidth={CELL_WIDTH_MAP[viewType]}
      cellHeight={CELL_HEIGHT}
      highlightTime={highlightTime}
      {...({ baselines: showBaselines } as any)}
    />
  );
}
```

---

## 📋 작업 체크리스트

### 즉시 실행 (30분)
- [ ] 작업 1-1: GanttChartPageClient Props 수정
- [ ] 작업 1-2: 통계 섹션 제거
- [ ] 브라우저 테스트: 에러 없이 페이지 접근 확인

### 초기 로딩 개선 (1시간)
- [ ] 작업 2-1: useGanttData 초기 상태 수정
- [ ] 작업 2-2: GanttChart 렌더링 조건 단순화
- [ ] 브라우저 테스트: 로딩 → 빈 간트 차트 표시 확인

### Mock 데이터 (30분)
- [ ] 작업 3-1: Mock Gantt Chart 자동 생성 함수 추가
- [ ] 작업 3-2: ProjectDetailClient 자동 초기화
- [ ] 브라우저 테스트: Mock 프로젝트에 자동 차트 생성 확인

### 컴포넌트 분리 시작 (2시간)
- [ ] 작업 4-1: 폴더 구조 생성
- [ ] 작업 4-2: useGanttColumns 훅 작성
- [ ] 작업 4-3: useGanttScales 훅 작성
- [ ] 작업 4-4: GanttCore 컴포넌트 작성
- [ ] (다음 단계) GanttChart/index.tsx에서 기존 로직 마이그레이션

---

## 🎯 다음 단계

이 작업들을 완료하면:
1. ✅ 기본 에러 해결
2. ✅ 안정적인 데이터 로딩
3. ✅ Mock 데이터 자동 생성
4. ✅ 컴포넌트 분리 기반 마련

**다음 작업**: 
- GanttChart/index.tsx에서 기존 코드를 새로운 구조로 마이그레이션
- GanttToolbar, GanttEditor 컴포넌트 분리
- Phase 1 (데이터 레이어) 시작

---

**작성자**: Claude (Antigravity AI)  
**최종 수정**: 2025-11-25
