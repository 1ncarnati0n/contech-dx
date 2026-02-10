# 리팩토링 로드맵

> **작성일**: 2026-02-10
> **대상**: contech-dx 모노레포
> **총 예상 기간**: 8-12주

---

## 개요

이 로드맵은 발견된 이슈를 **우선순위와 의존성**에 따라 단계별로 해결하는 계획입니다.

```
Phase 1 (1주)          Phase 2 (2-4주)        Phase 3 (1-2개월)
├─ 긴급 버그 수정      ├─ 컴포넌트 분할        ├─ 테스트 확대
├─ API 검증 적용       ├─ Context 도입         ├─ 데이터 이관
└─ Gemini 안정화       └─ 캐시 개선            └─ 문서화
```

---

## Phase 1: 긴급 수정 (1주)

### 1.1 Supabase 인증 캐시 버그 수정

**우선순위**: 🔴 Critical
**예상 공수**: 0.5일
**담당 파일**: `apps/web/src/lib/supabase/server.ts`

#### 현재 문제
```typescript
// 에러가 무시되어 디버깅 어려움
setAll(cookiesToSet) {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    );
  } catch {
    // Server Component에서는 set이 동작하지 않을 수 있음
  }
}
```

#### 수정 방안
```typescript
setAll(cookiesToSet) {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    );
  } catch (error) {
    // Server Component에서는 정상적으로 실패할 수 있음
    // Route Handler에서의 실패만 로깅
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Supabase SSR] Cookie set skipped:',
        error instanceof Error ? error.message : 'unknown'
      );
    }
  }
}
```

#### 체크리스트
- [ ] `server.ts` 에러 핸들링 개선
- [ ] 개발 환경 로깅 추가
- [ ] 인증 플로우 테스트

---

### 1.2 API 파라미터 검증 미들웨어 적용

**우선순위**: 🔴 Critical
**예상 공수**: 1일
**담당 파일**: `apps/web/src/app/api/` 내 모든 라우트

#### 현재 상태
- `withValidation` 미들웨어 구현됨 (`lib/api/withValidation.ts`)
- 일부 API 라우트에서 미사용

#### 수정 방안

1. **검증이 필요한 라우트 식별**
```bash
# 직접 req.json() 호출하는 라우트 찾기
grep -r "await req.json()" apps/web/src/app/api/
```

2. **스키마 정의 및 적용**
```typescript
// 예: api/projects/route.ts
import { withValidation } from '@/lib/api/withValidation';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const POST = withValidation(
  { schema: createProjectSchema, source: 'body' },
  async (req, data) => {
    // data는 타입 안전
    const { name, description } = data;
    // ...
  }
);
```

#### 체크리스트
- [ ] 모든 POST/PUT/PATCH 라우트에 `withValidation` 적용
- [ ] 공통 스키마 정의 (`lib/schemas/`)
- [ ] 에러 응답 형식 통일

---

### 1.3 Gemini API 안정화

**우선순위**: 🟠 High
**예상 공수**: 1일
**담당 파일**: `apps/web/src/app/api/gemini/route.ts`

#### 수정 방안

```typescript
// 1. 입력 토큰 제한
const MAX_INPUT_TOKENS = 30000; // Gemini 1.5 기준 조정

function estimateTokens(text: string): number {
  // 대략적인 토큰 추정 (한글 기준)
  return Math.ceil(text.length / 2);
}

// 2. 청킹 전략
function chunkInput(text: string, maxTokens: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of text.split('\n\n')) {
    if (estimateTokens(current + paragraph) > maxTokens) {
      if (current) chunks.push(current);
      current = paragraph;
    } else {
      current += (current ? '\n\n' : '') + paragraph;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

// 3. 재시도 로직
async function callGeminiWithRetry(
  prompt: string,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callGemini(prompt);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 백오프
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### 체크리스트
- [ ] 입력 토큰 제한 구현
- [ ] 대용량 입력 청킹 처리
- [ ] 재시도 로직 추가
- [ ] 타임아웃 설정

---

## Phase 2: 단기 개선 (2-4주)

### 2.1 대형 컴포넌트 분할

**우선순위**: 🟠 High
**예상 공수**: 1-2주
**대상 파일**:
- `BasementProcessPlanPage.tsx` (2,155 LOC)
- `BuildingProcessPlanPage.tsx` (2,068 LOC)

#### 분할 전략

```
현재 구조:
BasementProcessPlanPage.tsx (2,155 LOC)
├── 상태 선언 (~100 LOC)
├── useCallback/useMemo (~400 LOC)
├── useEffect (~200 LOC)
├── 이벤트 핸들러 (~300 LOC)
└── JSX 렌더링 (~1,150 LOC)

목표 구조:
├── BasementProcessPlanPage.tsx (~200 LOC)  # 컨테이너
│   └── 레이아웃 및 자식 조합
│
├── hooks/
│   ├── useBasementProcessPlan.ts (~300 LOC)
│   │   └── 상태 관리 + CRUD 로직
│   └── useProcessCalculation.ts (~300 LOC)
│       └── 계산 로직 (순수 함수 호출)
│
├── components/
│   ├── ProcessPlanHeader.tsx (~150 LOC)
│   ├── ProcessPlanTable/
│   │   ├── index.tsx (~200 LOC)
│   │   ├── TableHeader.tsx (~100 LOC)
│   │   └── TableRow.tsx (~150 LOC)
│   ├── ProcessDetailPanel.tsx (~200 LOC)
│   └── SaveStatusBar.tsx (~100 LOC)
│
└── utils/
    └── basementCalculations.ts (~400 LOC)
        └── 순수 계산 함수
```

#### 체크리스트
- [ ] `useBasementProcessPlan` 훅 추출
- [ ] `useProcessCalculation` 훅 추출
- [ ] 테이블 컴포넌트 분리
- [ ] 계산 함수 유틸로 이동
- [ ] 기존 동작 회귀 테스트

---

### 2.2 Props Drilling 해소 (sa-gantt-lib)

**우선순위**: 🟠 High
**예상 공수**: 3-5일
**대상**: `packages/sa-gantt-lib/src/lib/components/`

#### Context 도입 방안

```typescript
// 1. GanttContext 정의
// lib/contexts/GanttContext.tsx
interface GanttContextValue {
  // 데이터
  tasks: ConstructionTask[];
  milestones: Milestone[];

  // 설정
  config: GanttConfig;

  // 콜백
  onTaskClick?: (taskId: string) => void;
  onTaskUpdate?: (task: ConstructionTask) => void;
  onTaskDragEnd?: (taskId: string, newDates: DateRange) => void;
}

const GanttContext = createContext<GanttContextValue | null>(null);

export function GanttProvider({
  children,
  ...props
}: PropsWithChildren<GanttContextValue>) {
  return (
    <GanttContext.Provider value={props}>
      {children}
    </GanttContext.Provider>
  );
}

export function useGanttContext() {
  const context = useContext(GanttContext);
  if (!context) {
    throw new Error('useGanttContext must be used within GanttProvider');
  }
  return context;
}

// 2. 컴포넌트에서 사용
// SAGanttChart.tsx (리팩토링 후)
export function SAGanttChart(props: GanttProps) {
  return (
    <GanttProvider {...props}>
      <GanttContainer />
    </GanttProvider>
  );
}

// TaskBar.tsx (리팩토링 후)
export function TaskBar({ task }: { task: ConstructionTask }) {
  const { onTaskClick, config } = useGanttContext();

  return (
    <div onClick={() => onTaskClick?.(task.id)}>
      {/* ... */}
    </div>
  );
}
```

#### 체크리스트
- [ ] `GanttContext` 정의
- [ ] `GanttProvider` 구현
- [ ] 주요 컴포넌트 리팩토링
- [ ] Props 제거 확인
- [ ] 라이브러리 빌드 테스트

---

### 2.3 캐시 일관성 개선

**우선순위**: 🟡 Medium
**예상 공수**: 2-3일
**대상**: `apps/web/src/lib/services/`

#### React Query 설정 표준화

```typescript
// lib/query/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5분
      gcTime: 1000 * 60 * 30,        // 30분 (구 cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // 인증 에러는 재시도 안함
        if (error instanceof AuthError) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      onError: (error) => {
        handleError(error, 'mutation');
      },
    },
  },
});
```

#### Supabase Realtime 연동

```typescript
// lib/hooks/useRealtimeSync.ts
export function useRealtimeSync(table: string, queryKey: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createBrowserClient();

    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table, queryKey]);
}
```

#### 체크리스트
- [ ] QueryClient 설정 중앙화
- [ ] 주요 테이블 Realtime 구독 구현
- [ ] 캐시 무효화 로직 검증

---

## Phase 3: 중기 개선 (1-2개월)

### 3.1 테스트 커버리지 확대

**우선순위**: 🟡 Medium
**예상 공수**: 2-4주
**목표 커버리지**: 50%

#### 테스트 전략

```
우선순위 1: 유틸리티 함수 (순수 함수)
├── lib/utils/process-calculation.ts
├── lib/utils/process-quantity-resolver.ts
└── sa-gantt-lib/src/lib/utils/dateUtils.ts

우선순위 2: 커스텀 훅
├── lib/hooks/useAsyncData.ts
└── sa-gantt-lib/src/lib/store/useGanttStore.ts

우선순위 3: API 라우트
├── api/gemini/route.ts
└── api/projects/route.ts

우선순위 4: 컴포넌트 (스냅샷)
└── 주요 UI 컴포넌트
```

#### 테스트 파일 구조

```
__tests__/
├── unit/
│   ├── utils/
│   │   └── process-calculation.test.ts
│   └── hooks/
│       └── useAsyncData.test.ts
├── integration/
│   └── api/
│       └── projects.test.ts
└── e2e/
    └── auth-flow.spec.ts
```

#### 체크리스트
- [ ] Jest + Testing Library 설정
- [ ] 유틸리티 함수 단위 테스트 (20개+)
- [ ] 훅 테스트 (10개+)
- [ ] API 통합 테스트 (5개+)
- [ ] CI 파이프라인에 테스트 추가

---

### 3.2 localStorage → Supabase 이관

**우선순위**: 🟡 Medium
**예상 공수**: 1-2주
**대상 데이터**: `contech_process_plan_{buildingId}`

#### 이관 전략

```
Phase A: 스키마 설계 (2일)
├── process_plans 테이블 생성
├── RLS 정책 설정
└── 타입 생성

Phase B: 서비스 레이어 (3일)
├── ProcessPlanService 구현
├── Supabase CRUD 함수
└── 로컬 캐시 레이어 (선택)

Phase C: 마이그레이션 (2일)
├── 기존 localStorage 데이터 읽기
├── Supabase로 업로드
└── 검증 및 정리

Phase D: 컴포넌트 리팩토링 (3일)
├── localStorage 코드 제거
├── 새 서비스 연동
└── 회귀 테스트
```

#### 스키마 예시

```sql
-- 공정 계획 테이블
CREATE TABLE process_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE process_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project process plans" ON process_plans
  FOR SELECT
  USING (
    building_id IN (
      SELECT b.id FROM buildings b
      JOIN projects p ON b.project_id = p.id
      JOIN team_members tm ON tm.project_id = p.id
      WHERE tm.user_id = auth.uid()
    )
  );
```

#### 체크리스트
- [ ] 테이블 및 RLS 정책 생성
- [ ] ProcessPlanService 구현
- [ ] 마이그레이션 스크립트 작성
- [ ] 컴포넌트 리팩토링
- [ ] 기존 데이터 마이그레이션 실행

---

### 3.3 문서화

**우선순위**: 🟢 Low
**예상 공수**: 1주
**대상**: 주요 컴포넌트 및 훅

#### 문서화 범위

```
docs/
├── api/                    # API 레퍼런스
│   ├── components.md       # 컴포넌트 Props
│   └── hooks.md            # 훅 사용법
├── guides/                 # 가이드
│   ├── getting-started.md  # 시작하기
│   └── architecture.md     # 아키텍처 개요
└── examples/               # 예시 코드
    └── gantt-usage.md      # 간트 차트 사용 예시
```

#### TSDoc 적용 예시

```typescript
/**
 * 간트 차트 메인 컴포넌트
 *
 * @example
 * ```tsx
 * <SAGanttChart
 *   tasks={tasks}
 *   onTaskClick={(id) => console.log(id)}
 * />
 * ```
 *
 * @param props - 컴포넌트 속성
 * @param props.tasks - 표시할 작업 목록
 * @param props.onTaskClick - 작업 클릭 시 콜백
 */
export function SAGanttChart(props: SAGanttChartProps) {
  // ...
}
```

#### 체크리스트
- [ ] 주요 컴포넌트 TSDoc 추가
- [ ] 훅 사용 가이드 작성
- [ ] API 레퍼런스 생성
- [ ] README 업데이트

---

## 마일스톤 요약

| Phase | 기간 | 주요 목표 | 완료 기준 |
|-------|------|----------|----------|
| **Phase 1** | 1주 | 긴급 버그 수정 | 인증/API/Gemini 안정화 |
| **Phase 2** | 2-4주 | 구조 개선 | 컴포넌트 <500 LOC, Context 도입 |
| **Phase 3** | 1-2개월 | 품질 향상 | 테스트 50%, 데이터 이관 완료 |

---

## 리스크 및 대응

| 리스크 | 확률 | 영향 | 대응 방안 |
|--------|------|------|----------|
| 리팩토링 중 기능 회귀 | 중 | 높음 | Phase 1에서 테스트 기반 구축 |
| 데이터 마이그레이션 실패 | 낮음 | 높음 | 백업 + 롤백 계획 준비 |
| 일정 지연 | 중 | 중 | Phase별 독립 완료 가능하게 설계 |

---

## 다음 단계

구현 상세 가이드는 [05-implementation-guide.md](./05-implementation-guide.md) 참조.

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었습니다.*
