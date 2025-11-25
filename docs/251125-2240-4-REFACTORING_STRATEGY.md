# 🏗️ Contech-DX 프로젝트 리팩토링 전략

**작성일**: 2025-11-25  
**작성자**: Claude (Antigravity AI)  
**목적**: 유지보수성, 가독성, 확장성을 개선하기 위한 전체 프로젝트 리팩토링 계획

---

## 📊 1. 현재 프로젝트 구조 분석

### 1.1 기술 스택
- **Framework**: Next.js 16.0.1 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19.2.0 + Tailwind CSS 4
- **State**: React Hooks (No global state management)
- **Database**: Supabase (with Mock fallback)
- **Gantt**: SVAR React Gantt v2.3.4
- **Forms**: React Hook Form + Zod
- **Animation**: Framer Motion

### 1.2 디렉토리 구조
```
src/
├── app/                    # Next.js App Router 페이지
│   ├── (container)/        # 레이아웃 그룹
│   ├── api/                # API Routes
│   ├── auth/               # 인증 페이지
│   └── file-search/        # 파일 검색 기능
├── components/             # React 컴포넌트 (44개)
│   ├── admin/              # 관리자 기능
│   ├── auth/               # 인증 UI
│   ├── comments/           # 댓글 기능
│   ├── file-search/        # 파일 검색 UI
│   ├── gantt/              # Gantt Chart (5개 파일) ⭐
│   ├── layout/             # 레이아웃 컴포넌트
│   ├── posts/              # 게시글 기능
│   ├── profile/            # 프로필 기능
│   ├── projects/           # 프로젝트 관리 (5개 파일) ⭐
│   └── ui/                 # 공통 UI 컴포넌트 (13개)
├── lib/                    # 비즈니스 로직 및 유틸리티
│   ├── gantt/              # Gantt 로직 (21개 파일) ⭐
│   ├── permissions/        # 권한 관리
│   ├── services/           # 데이터 서비스 (10개 파일)
│   ├── supabase/           # Supabase 클라이언트
│   └── utils/              # 공통 유틸리티
├── data/                   # 정적 데이터
├── styles/                 # 글로벌 스타일
└── types/                  # TypeScript 타입 정의
```

---

## 🔍 2. 문제점 분석

### 2.1 아키텍처 문제
❌ **문제 1: 데이터 로딩 이중화**
- **현상**: 서버 컴포넌트와 클라이언트 훅 양쪽에서 데이터 로딩
- **영향**: 
  - Mock 데이터와 실제 DB 데이터 충돌
  - UUID vs Mock ID 타입 에러
  - 불필요한 네트워크 요청
- **위치**: 
  - `app/(container)/projects/[id]/gantt/[chartId]/page.tsx`
  - `lib/gantt/hooks/useGanttData.ts`

❌ **문제 2: Props Drilling**
- **현상**: GanttChartPageClient → GanttWrapper → GanttChart로 props 전달
- **영향**: 컴포넌트 간 강한 결합, 유지보수 어려움

❌ **문제 3: 타입 안정성 부족**
- **현상**: `any` 타입 과다 사용 (특히 Gantt API)
- **영향**: 런타임 에러 발생 가능성, IDE 지원 부족

### 2.2 코드 품질 문제
❌ **문제 4: 컴포넌트 책임 과다**
- `GanttChart.tsx`: 336줄 - UI, 데이터, 이벤트 처리 모두 포함
- `useGanttData.ts`: 245줄 - 로딩, 저장, 동기화, Mock 시딩 모두 포함

❌ **문제 5: 일관성 없는 네이밍**
- `GanttChartPageClient` vs `ProjectDetailClient`
- `useGanttSchedule` vs `useGanttData` (역할 구분 불명확)

❌ **문제 6: 중복 코드**
- Mock 데이터 초기화 로직이 여러 곳에 산재
- 날짜 포매팅, 통화 포매팅 등 유틸리티 함수 중복

### 2.3 성능 문제
⚠️ **문제 7: 불필요한 리렌더링**
- `GanttChart`에서 모든 props를 `useMemo`로 처리하지만 의존성 배열 누락
- `schedule` 상태 업데이트 시 전체 컴포넌트 리렌더링

⚠️ **문제 8: 번들 크기**
- SVAR Gantt CSS 전체 import
- 사용하지 않는 UI 컴포넌트들

---

## 🎯 3. 리팩토링 목표

### 3.1 핵심 원칙
1. **단일 책임 원칙 (SRP)**: 하나의 컴포넌트/함수는 하나의 책임만
2. **관심사 분리 (SoC)**: UI, 로직, 데이터를 명확히 분리
3. **타입 안정성**: `any` 제거, 명확한 타입 정의
4. **재사용성**: 공통 로직은 유틸리티/훅으로 추출
5. **테스트 가능성**: 순수 함수 중심, 의존성 주입

### 3.2 측정 가능한 목표
- ✅ 컴포넌트 평균 라인 수: 200줄 이하
- ✅ 함수 평균 라인 수: 50줄 이하
- ✅ `any` 타입 사용: 0개
- ✅ 테스트 커버리지: 60% 이상 (핵심 로직)
- ✅ 번들 크기: 현재 대비 15% 감소

---

## 🚀 4. 리팩토링 실행 계획

### Phase 1: 데이터 레이어 개선 (우선순위: 🔴 높음)

#### 1.1 Mock 데이터 처리 통합
**목표**: Mock과 실제 데이터 처리를 일관되게 통합

**작업**:
```typescript
// ❌ Before: 여러 곳에 산재
// services/projects.ts, services/ganttCharts.ts, lib/gantt/hooks/useGanttData.ts

// ✅ After: 통합 Mock Provider
// lib/providers/MockDataProvider.ts
export class MockDataProvider {
  private static instance: MockDataProvider;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new MockDataProvider();
    }
    return this.instance;
  }
  
  async getProjects(): Promise<Project[]> { /* ... */ }
  async getGanttChart(id: string): Promise<GanttChart | null> { /* ... */ }
  async getTasks(chartId: string): Promise<Task[]> { /* ... */ }
  // ...
}

// lib/providers/DataProvider.ts
export class DataProvider {
  constructor(private useMock: boolean) {}
  
  async getProjects(): Promise<Project[]> {
    if (this.useMock) {
      return MockDataProvider.getInstance().getProjects();
    }
    return SupabaseProvider.getInstance().getProjects();
  }
  // ...
}
```

**파일**:
- 신규: `lib/providers/MockDataProvider.ts`
- 신규: `lib/providers/SupabaseProvider.ts`
- 신규: `lib/providers/DataProvider.ts`
- 수정: 모든 `services/*.ts` 파일

**예상 소요**: 4시간

---

#### 1.2 서비스 레이어 리팩토링
**목표**: 서비스 함수를 클래스 기반으로 변경하여 의존성 관리 개선

```typescript
// ❌ Before
export async function getProject(id: string, supabaseClient?: SupabaseClient) {
  if (USE_MOCK) { /* ... */ }
  const supabase = supabaseClient || createClient();
  // ...
}

// ✅ After
export class ProjectService {
  constructor(private provider: DataProvider) {}
  
  async getById(id: string): Promise<Project | null> {
    return this.provider.getProject(id);
  }
  
  async getAll(): Promise<Project[]> {
    return this.provider.getProjects();
  }
  
  async create(data: CreateProjectDTO): Promise<Project> {
    return this.provider.createProject(data);
  }
  // ...
}
```

**파일**:
- 수정: `lib/services/projects.ts`
- 수정: `lib/services/ganttCharts.ts`
- 수정: `lib/services/tasks.ts`
- 수정: `lib/services/links.ts`

**예상 소요**: 3시간

---

### Phase 2: Gantt 컴포넌트 분리 (우선순위: 🔴 높음)

#### 2.1 GanttChart 컴포넌트 분해
**목표**: 336줄의 거대 컴포넌트를 역할별로 분리

**구조 변경**:
```
components/gantt/
├── GanttChart/
│   ├── index.tsx                    # 메인 컨테이너 (100줄 이하)
│   ├── GanttCore.tsx                # SVAR Gantt 래퍼 (80줄 이하)
│   ├── GanttToolbar.tsx             # 툴바 (60줄 이하)
│   ├── GanttEditor.tsx              # 에디터 (80줄 이하)
│   ├── GanttContextMenu.tsx         # 컨텍스트 메뉴 (60줄 이하)
│   ├── useGanttColumns.ts           # 컬럼 설정 훅
│   ├── useGanttScales.ts            # 스케일 설정 훅
│   └── types.ts                     # 컴포넌트 타입
├── GanttControls.tsx
├── GanttWrapper.tsx
├── TaskTooltip.tsx
└── WillowTheme.tsx
```

**예시 코드**:
```typescript
// components/gantt/GanttChart/GanttCore.tsx
interface GanttCoreProps {
  schedule: Schedule;
  viewType: ViewType;
  onApiReady: (api: GanttApi) => void;
}

export function GanttCore({ schedule, viewType, onApiReady }: GanttCoreProps) {
  const columns = useGanttColumns();
  const scales = useGanttScales(viewType);
  const highlightTime = useGanttHighlight();
  
  return (
    <Gantt
      init={onApiReady}
      tasks={schedule.tasks}
      links={schedule.links}
      scales={scales}
      columns={columns}
      cellWidth={CELL_WIDTH_MAP[viewType]}
      cellHeight={CELL_HEIGHT}
      highlightTime={highlightTime}
      taskTypes={TASK_TYPES}
    />
  );
}
```

**파일**:
- 수정: `components/gantt/GanttChart.tsx` → `components/gantt/GanttChart/index.tsx`
- 신규: `components/gantt/GanttChart/GanttCore.tsx`
- 신규: `components/gantt/GanttChart/GanttToolbar.tsx`
- 신규: `components/gantt/GanttChart/GanttEditor.tsx`
- 신규: `components/gantt/GanttChart/useGanttColumns.ts`
- 신규: `components/gantt/GanttChart/useGanttScales.ts`

**예상 소요**: 5시간

---

#### 2.2 Gantt 훅 리팩토링
**목표**: `useGanttData` (245줄)를 역할별로 분리

```typescript
// ❌ Before: useGanttData가 모든 것을 처리
export function useGanttData(apiRef, ganttChartId) {
  // 로딩, 저장, 동기화, Mock 시딩 모두 포함
}

// ✅ After: 역할별 분리
export function useGanttData(ganttChartId: string) {
  const { data, isLoading } = useGanttLoader(ganttChartId);
  const { save, saveState } = useGanttSaver(ganttChartId);
  const { sync } = useGanttSync();
  
  return { data, isLoading, save, saveState, sync };
}

// lib/gantt/hooks/useGanttLoader.ts
export function useGanttLoader(chartId: string) {
  const [data, setData] = useState<Schedule>(EMPTY_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      const [tasks, links] = await Promise.all([
        TaskService.getByChartId(chartId),
        LinkService.getByChartId(chartId),
      ]);
      setData({ tasks, links, scales: DEFAULT_SCALES });
      setIsLoading(false);
    };
    loadData();
  }, [chartId]);
  
  return { data, isLoading };
}

// lib/gantt/hooks/useGanttSaver.ts
export function useGanttSaver(chartId: string) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  
  const save = useCallback(async (data: Schedule) => {
    setSaveState('saving');
    try {
      await TaskService.batchUpsert(data.tasks, chartId);
      await LinkService.batchUpsert(data.links, chartId);
      setSaveState('saved');
      toast.success('저장 완료');
    } catch (error) {
      setSaveState('error');
      toast.error('저장 실패');
    }
  }, [chartId]);
  
  return { save, saveState };
}
```

**파일**:
- Refactor: `lib/gantt/hooks/useGanttData.ts` (245줄 → 80줄)
- 신규: `lib/gantt/hooks/useGanttLoader.ts` (80줄)
- 신규: `lib/gantt/hooks/useGanttSaver.ts` (70줄)
- 신규: `lib/gantt/hooks/useGanttSync.ts` (50줄)
- 수정: `lib/gantt/hooks/useGanttSchedule.ts`

**예상 소요**: 4시간

---

### Phase 3: 타입 안정성 강화 (우선순위: 🟡 중간)

#### 3.1 Gantt API 타입 정의
**목표**: `any` 타입 제거, SVAR Gantt API의 정확한 타입 정의

```typescript
// lib/gantt/types/api.ts
export interface GanttApi {
  // Core methods
  serialize(): RawTask[];
  getStores(): GanttStores;
  getState(): GanttState;
  getTask(id: TaskId): Task | undefined;
  
  // Actions
  exec(action: 'add-task', data: AddTaskPayload): void;
  exec(action: 'update-task', data: UpdateTaskPayload): void;
  exec(action: 'delete-task', data: DeleteTaskPayload): void;
  // ... 다른 액션들
  
  // Events
  on(event: 'update-task', handler: (ev: UpdateTaskEvent) => void): () => void;
  on(event: 'delete-task', handler: (ev: DeleteTaskEvent) => void): () => void;
  // ... 다른 이벤트들
  
  // Interceptors
  intercept(action: string, handler: (data: unknown) => boolean | void): void;
  
  // Cleanup
  detach?(): void;
}

export interface GanttStores {
  data: DataStore;
  selected?: SelectedStore;
}

export interface DataStore {
  getState(): { tasks: RawTask[]; links: RawLink[] };
}
```

**파일**:
- 대폭 수정: `lib/gantt/types/api.ts`
- 신규: `lib/gantt/types/events.ts`
- 신규: `lib/gantt/types/actions.ts`

**예상 소요**: 3시간

---

#### 3.2 Props 타입 명확화
**목표**: 모든 컴포넌트 Props에 명확한 타입 정의

```typescript
// Before: 타입 없이 전달
<GanttWrapper ganttChartId={ganttChart.id} onGanttReady={(api) => {}} />

// After: 명확한 타입
interface GanttWrapperProps {
  ganttChartId: string;
  onGanttReady?: (api: GanttApi) => void;
  initialData?: Partial<Schedule>;
  readonly?: boolean;
}

export function GanttWrapper(props: GanttWrapperProps) { /* ... */ }
```

**파일**:
- 수정: 모든 `components/**/*.tsx` (props 타입 명시)

**예상 소요**: 2시간

---

### Phase 4: 공통 로직 추출 (우선순위: 🟡 중간)

#### 4.1 유틸리티 함수 통합
**목표**: 중복된 포매팅, 검증 로직을 중앙화

```typescript
// lib/utils/formatters.ts
export const formatters = {
  currency(amount?: number, locale = 'ko-KR'): string {
    if (!amount) return '-';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  },
  
  date(dateStr: string, locale = 'ko-KR'): string {
    return new Date(dateStr).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },
  
  dateRange(start: string, end?: string, locale = 'ko-KR'): string {
    const startFormatted = this.date(start, locale);
    if (!end) return startFormatted;
    return `${startFormatted} ~ ${this.date(end, locale)}`;
  },
};

// lib/utils/validators.ts
export const validators = {
  isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },
  
  isMockId(id: string): boolean {
    return id.startsWith('mock-');
  },
};
```

**파일**:
- 신규: `lib/utils/formatters.ts`
- 신규: `lib/utils/validators.ts`
- 수정: 중복 코드 사용 중인 모든 컴포넌트

**예상 소요**: 2시간

---

#### 4.2 커스텀 훅 추출
**목표**: 반복되는 패턴을 재사용 가능한 훅으로 추출

```typescript
// lib/hooks/useClientOnly.ts
export function useClientOnly() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient;
}

// lib/hooks/useConfirm.ts
export function useConfirm() {
  return useCallback((message: string): boolean => {
    if (typeof window === 'undefined') return false;
    return window.confirm(message);
  }, []);
}

// lib/hooks/usePrompt.ts
export function usePrompt() {
  return useCallback((message: string): string | null => {
    if (typeof window === 'undefined') return null;
    return window.prompt(message);
  }, []);
}
```

**사용 예**:
```typescript
// Before
const [isClient, setIsClient] = useState(false);
useEffect(() => setIsClient(true), []);

// After
const isClient = useClientOnly();
```

**파일**:
- 신규: `lib/hooks/useClientOnly.ts`
- 신규: `lib/hooks/useConfirm.ts`
- 신규: `lib/hooks/usePrompt.ts`
- 수정: 해당 패턴을 사용하는 모든 컴포넌트

**예상 소요**: 2시간

---

### Phase 5: 네이밍 및 구조 개선 (우선순위: 🟢 낮음)

#### 5.1 일관된 네이밍 규칙 적용
**목표**: 프로젝트 전체에 일관된 네이밍 컨벤션 적용

**규칙**:
- **컴포넌트**: PascalCase, 명확한 역할 표시
  - `XxxPageClient` → `XxxPage` (클라이언트 컴포넌트는 기본)
  - `XxxButton` → 액션명 + 객체명 (예: `DeleteProjectButton`)
  
- **훅**: `use` + 동사/명사
  - `useGanttData` → `useGanttSchedule` (더 명확)
  - `useGanttSchedule` → `useGantt` (간결)
  
- **서비스**: 객체명 + `Service`
  - `projects.ts` → `ProjectService.ts`
  - 함수 → 클래스 메서드

- **타입**: 명확한 접미사
  - `Props` → `ComponentNameProps`
  - `DTO` (Data Transfer Object)
  - `Entity` (데이터베이스 엔티티)

**파일**:
- 수정: 거의 모든 파일 (점진적 진행)

**예상 소요**: 4시간

---

#### 5.2 폴더 구조 재조직
**목표**: Feature-based 구조로 전환하여 응집도 향상

```
// ❌ Before: Type-based (현재)
src/
├── components/
│   ├── gantt/
│   └── projects/
├── lib/
    ├── gantt/
    └── services/

// ✅ After: Feature-based (권장)
src/
├── features/
│   ├── gantt/
│   │   ├── components/
│   │   │   ├── GanttChart/
│   │   │   ├── GanttControls/
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useGantt.ts
│   │   │   ├── useGanttLoader.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── TaskService.ts
│   │   │   ├── LinkService.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── index.ts
│   │   └── index.ts (public API)
│   │
│   └── projects/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── index.ts
│
├── shared/                 # 공통 기능
│   ├── components/
│   │   └── ui/
│   ├── hooks/
│   ├── utils/
│   └── types/
│
└── app/                    # Next.js pages (그대로 유지)
```

**주의**: 이 변경은 대규모이므로 별도 프로젝트로 진행하거나, 점진적으로 진행 권장

**예상 소요**: 8시간 (점진적 진행 시 더 길 수 있음)

---

### Phase 6: 성능 최적화 (우선순위: 🟢 낮음)

#### 6.1 메모이제이션 개선
**목표**: 불필요한 리렌더링 방지

```typescript
// Before: 의존성 배열 누락
const columns = useMemo(() => {
  return defaultColumns.map(/* ... */);
}, []); // ❌ 의존성 누락 가능성

// After: 명확한 의존성 관리
const columns = useMemo(() => {
  return createColumns({
    startColumnWidth: START_COLUMN_WIDTH,
    dateFormatter,
  });
}, [dateFormatter]); // ✅ 명확한 의존성
```

**파일**:
- 수정: `components/gantt/GanttChart/index.tsx`
- 수정: 기타 성능 병목 컴포넌트

**예상 소요**: 2시간

---

#### 6.2 코드 스플리팅 최적화
**목표**: 초기 로딩 속도 개선

```typescript
// Before: 모든 것을 한 번에 import
import { Gantt, Editor, Toolbar, ContextMenu, Tooltip } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

// After: 필요한 것만 dynamic import
const Gantt = dynamic(() => import("@svar-ui/react-gantt").then(m => m.Gantt), {
  ssr: false,
  loading: () => <GanttSkeleton />,
});

// CSS도 조건부 로딩
useEffect(() => {
  import("@svar-ui/react-gantt/gantt.css");
}, []);
```

**파일**:
- 수정: `components/gantt/GanttWrapper.tsx`
- 수정: 기타 대용량 라이브러리 사용 컴포넌트

**예상 소요**: 2시간

---

## 📅 5. 실행 일정

### Week 1: 기반 정리
- **Day 1-2**: Phase 1.1 - Mock 데이터 처리 통합
- **Day 3-4**: Phase 1.2 - 서비스 레이어 리팩토링
- **Day 5**: Phase 3.1 - Gantt API 타입 정의

### Week 2: 컴포넌트 개선
- **Day 1-2**: Phase 2.1 - GanttChart 컴포넌트 분해
- **Day 3-4**: Phase 2.2 - Gantt 훅 리팩토링
- **Day 5**: Phase 3.2 - Props 타입 명확화

### Week 3: 마무리 및 최적화
- **Day 1-2**: Phase 4 - 공통 로직 추출
- **Day 3-4**: Phase 5.1 - 네이밍 규칙 적용
- **Day 5**: Phase 6 - 성능 최적화

**총 예상 소요**: 약 50-60시간 (3주)

---

## ✅ 6. 우선순위별 작업 순서

### 🔴 **즉시 시작 (Critical)**
1. **Phase 1.1**: Mock 데이터 처리 통합 (현재 버그의 근본 원인)
2. **Phase 2.1**: GanttChart 컴포넌트 분해 (가독성 급선무)
3. **Phase 2.2**: Gantt 훅 리팩토링 (유지보수성)

### 🟡 **다음 단계 (Important)**
4. Phase 3.1: Gantt API 타입 정의
5. Phase 4.1: 유틸리티 함수 통합
6. Phase 4.2: 커스텀 훅 추출

### 🟢 **이후 진행 (Nice to Have)**
7. Phase 5.1: 네이밍 규칙 적용
8. Phase 6: 성능 최적화
9. Phase 5.2: 폴더 구조 재조직 (별도 프로젝트 고려)

---

## 📝 7. 체크리스트

### Phase 1: 데이터 레이어
- [ ] MockDataProvider 클래스 생성
- [ ] SupabaseProvider 클래스 생성
- [ ] DataProvider 통합
- [ ] ProjectService 클래스화
- [ ] GanttChartService 클래스화
- [ ] TaskService 클래스화
- [ ] LinkService 클래스화
- [ ] 기존 서비스 함수 마이그레이션
- [ ] 테스트 작성

### Phase 2: Gantt 컴포넌트
- [ ] GanttChart 폴더 구조 생성
- [ ] GanttCore 컴포넌트 분리
- [ ] GanttToolbar 컴포넌트 분리
- [ ] GanttEditor 컴포넌트 분리
- [ ] useGanttColumns 훅 생성
- [ ] useGanttScales 훅 생성
- [ ] useGanttLoader 훅 생성
- [ ] useGanttSaver 훅 생성
- [ ] useGanttSync 훅 생성
- [ ] 기존 코드 마이그레이션

### Phase 3: 타입 안정성
- [ ] GanttApi 인터페이스 정의
- [ ] GanttStores 인터페이스 정의
- [ ] Event 타입 정의
- [ ] Action 타입 정의
- [ ] 모든 컴포넌트 Props 타입 명시
- [ ] `any` 타입 제거

### Phase 4: 공통 로직
- [ ] formatters 유틸리티 생성
- [ ] validators 유틸리티 생성
- [ ] useClientOnly 훅 생성
- [ ] useConfirm 훅 생성
- [ ] usePrompt 훅 생성
- [ ] 중복 코드 마이그레이션

### Phase 5: 네이밍 및 구조
- [ ] 컴포넌트 네이밍 통일
- [ ] 훅 네이밍 통일
- [ ] 서비스 네이밍 통일
- [ ] 타입 네이밍 통일
- [ ] (선택) Feature-based 구조 전환

### Phase 6: 성능 최적화
- [ ] useMemo/useCallback 의존성 검토
- [ ] React.memo 적용
- [ ] Dynamic import 적용
- [ ] CSS 코드 스플리팅
- [ ] 번들 크기 분석

---

## 🎓 8. 리팩토링 가이드라인

### 8.1 코드 스타일
```typescript
// ✅ Good: 명확한 타입, 단일 책임, 재사용 가능
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ onClick, children, variant = 'primary', disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(buttonVariants({ variant }), disabled && 'opacity-50')}
    >
      {children}
    </button>
  );
}

// ❌ Bad: any 타입, 여러 책임, 재사용 어려움
export function Button(props: any) {
  const [count, setCount] = useState(0); // 버튼에 왜 카운트?
  const fetchData = async () => { /* API 호출 */ }; // 버튼에 왜 API?
  
  return (
    <button onClick={props.onClick}>
      {props.text}
      {count}
    </button>
  );
}
```

### 8.2 커밋 메시지 규칙
```
feat(gantt): GanttCore 컴포넌트 분리
refactor(services): ProjectService 클래스화
fix(gantt): Mock 데이터 UUID 에러 수정
perf(gantt): useMemo 의존성 최적화
docs: 리팩토링 전략 문서 작성
```

### 8.3 테스트 작성
```typescript
// 각 Phase 완료 후 핵심 로직 테스트 작성
describe('TaskService', () => {
  it('should fetch tasks by chart id', async () => {
    const tasks = await TaskService.getByChartId('chart-1');
    expect(tasks).toBeInstanceOf(Array);
  });
  
  it('should handle mock data correctly', async () => {
    const mockProvider = new MockDataProvider();
    const tasks = await mockProvider.getTasks('mock-chart-1');
    expect(tasks.length).toBeGreaterThan(0);
  });
});
```

---

## 🚨 9. 주의사항 및 리스크

### 9.1 주의사항
1. **점진적 진행**: 한 번에 모든 것을 바꾸지 말고 Phase별로 진행
2. **백업**: 각 Phase 시작 전 Git 브랜치 생성
3. **테스트**: 각 Phase 완료 후 기능 테스트 필수
4. **문서화**: 변경사항은 즉시 문서화

### 9.2 리스크 관리
| 리스크 | 가능성 | 영향도 | 대응 방안 |
|--------|--------|--------|-----------|
| 기존 기능 손상 | 중 | 높음 | Phase별 테스트, 롤백 계획 |
| 일정 지연 | 높음 | 중 | 우선순위별 진행, 선택적 Phase 생략 |
| 타입 에러 증가 | 중 | 중 | 점진적 타입 적용, any 임시 허용 |
| 성능 저하 | 낮음 | 중 | 성능 모니터링, 벤치마크 |

---

## 📚 10. 참고 자료

- [React Best Practices 2024](https://react.dev/learn/thinking-in-react)
- [SOLID Principles in React](https://blog.bitsrc.io/solid-principles-in-react-6561f364b05d)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [SVAR React Gantt Docs](https://docs.svar.dev/gantt/react/)

---

## 🎯 마무리

이 리팩토링 전략은 **유지보수성**, **가독성**, **확장성**을 핵심 목표로 합니다.

**시작 전 확인사항**:
1. ✅ 현재 기능이 정상 작동하는지 확인
2. ✅ Git 브랜치 생성: `refactor/phase-1-data-layer`
3. ✅ 팀원들과 리팩토링 계획 공유
4. ✅ 백업 및 롤백 계획 수립

**시작 시점**: Phase 1.1부터 즉시 시작 권장  
**예상 완료**: 약 3주 후

---

**작성자**: Claude (Antigravity AI)  
**문서 버전**: 1.0  
**최종 수정일**: 2025-11-25

