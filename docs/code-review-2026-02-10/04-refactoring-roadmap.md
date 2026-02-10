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

### 2.2 GanttContext 범위 확장 (sa-gantt-lib)

**우선순위**: 🟠 High
**예상 공수**: 2-3일
**대상**: `packages/sa-gantt-lib/src/lib/context/GanttContext.tsx` (168 LOC, 이미 존재)

> **참고**: GanttContext는 이미 구현되어 있으며(168 LOC), 주요 데이터와 콜백을 자식 컴포넌트에 제공 중. 이 작업은 **기존 Context의 범위를 확장**하는 것.

#### 확장 방안

```typescript
// 현재: GanttContext.tsx (168 LOC) - 이미 구현됨
// 확장 대상: 타임라인 설정, 줌 레벨, 사이드바 설정 등 추가

// 현재 GanttContext가 제공하는 것:
// - tasks, milestones, config
// - onTaskClick, onTaskUpdate, onTaskDragEnd

// 추가 예정:
interface ExtendedGanttContextValue extends GanttContextValue {
  // 타임라인 설정
  timelineConfig: TimelineConfig;

  // 줌 설정
  zoomConfig: ZoomConfig;

  // 사이드바 설정
  sidebarConfig: SidebarConfig;
}

// 자식 컴포넌트에서 사용 (이미 이 패턴 사용 중)
const { tasks, onTaskClick, config } = useGanttContext();
```

#### 체크리스트
- [ ] 기존 `GanttContext`(168 LOC) 확장
- [ ] 타임라인/줌/사이드바 설정 Context에 추가
- [ ] 중간 컴포넌트의 불필요한 props 제거
- [ ] Props 의존성 감소 확인
- [ ] 라이브러리 빌드 테스트

---

### 2.3 MemoryCache + Supabase Realtime 캐시 연동

**우선순위**: 🟡 Medium
**예상 공수**: 2-3일
**대상**: `apps/web/src/lib/services/cache.ts` (190 LOC) + 신규 Realtime 연동

> **참고**: 프로젝트는 React Query를 사용하지 않음. 자체 구현한 `MemoryCache<T>` 클래스(TTL 기반)를 사용하며, 이를 Supabase Realtime과 연동하는 것이 목표.

#### MemoryCache 현황 (cache.ts, 190 LOC)

```typescript
// 이미 구현된 MemoryCache 클래스 핵심 메서드:
export class MemoryCache<T> {
  get(key: string): T | null;          // TTL 확인 후 반환
  set(key: string, data: T, ttl?: number): void;
  getOrFetch(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>;
  invalidate(key: string): void;       // 단일 키 무효화
  invalidateAll(): void;               // 전체 무효화
  cleanup(): void;                     // 만료 엔트리 정리
}

// 미리 정의된 인스턴스:
export const projectsCache  = new MemoryCache<unknown>({ name: 'projects', ttl: DEFAULT_TTL });  // 5분
export const profilesCache  = new MemoryCache<unknown>({ name: 'profiles', ttl: DEFAULT_TTL });  // 5분
export const postsCache     = new MemoryCache<unknown>({ name: 'posts',    ttl: SHORT_TTL });    // 1분
```

#### Supabase Realtime 연동 방안

```typescript
// lib/hooks/useRealtimeSync.ts (신규)
export function useRealtimeCacheSync(
  table: string,
  cache: MemoryCache<unknown>,
  onInvalidate?: () => void
) {
  useEffect(() => {
    const supabase = createBrowserClient();

    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          cache.invalidateAll();
          onInvalidate?.();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table]);
}

// 사용 예시:
useRealtimeCacheSync('projects', projectsCache, () => {
  // 클라이언트 상태 갱신 트리거
  refreshProjectList();
});
```

#### 체크리스트
- [ ] `useRealtimeCacheSync` 훅 구현
- [ ] 주요 테이블(projects, buildings) Realtime 구독
- [ ] MemoryCache invalidate와 UI 갱신 연결
- [ ] 캐시 무효화 로직 검증

---

## Phase 3: 중기 개선 (1-2개월)

### 3.1 테스트 커버리지 확대

**우선순위**: 🟡 Medium
**예상 공수**: 2-4주
**목표 커버리지**: 50%

> **참고**: 현재 **11개 테스트 파일**이 `apps/web/src/__tests__/`에 존재하며, 핵심 비즈니스 로직(공정 계산, 물량 해석, 간트 변환) 위주로 테스트가 작성되어 있음. 이를 기반으로 확대.

#### 기존 테스트 현황 (11개 파일)

```
apps/web/src/__tests__/
├── components/
│   └── Button.test.tsx                    # UI 컴포넌트
└── utils/
    ├── cache.test.ts                      # MemoryCache TTL
    ├── calculateFormula.test.ts           # 수식 계산
    ├── floorIdUtils.test.ts               # 층 ID 유틸
    ├── process-calculation.test.ts        # 공정 계산
    ├── process-days-calculator.test.ts    # 공정일 계산기
    ├── process-quantity-resolver.test.ts  # 물량 해석
    ├── process-to-gantt-converter.test.ts # 간트 변환기
    ├── quantity-reference-migration.test.ts # 레거시 마이그레이션
    ├── quantity-reference.test.ts         # 물량 참조
    └── tradeDataHelpers.test.ts           # 공종 데이터 헬퍼
```

#### 확대 전략 (기존 테스트 기반)

```
우선순위 1: 기존 유틸 테스트 강화 (이미 기반 있음)
├── process-to-gantt-converter.test.ts ← 엣지 케이스 추가
├── quantity-reference.test.ts ← 마이그레이션 시나리오 추가
└── sa-gantt-lib/utils/date/ ← 달력 시스템 테스트 신규

우선순위 2: 커스텀 훅 테스트 (신규)
├── lib/hooks/useAsyncData.ts
└── sa-gantt-lib/src/lib/store/useGanttStore.ts

우선순위 3: API 라우트 통합 테스트 (신규)
├── api/gemini/route.ts
└── api/projects/route.ts

우선순위 4: 컴포넌트 테스트 확대 (Button만 존재)
└── 주요 페이지 컴포넌트
```

#### 체크리스트
- [ ] 기존 11개 테스트 파일의 엣지 케이스 보강
- [ ] 달력 시스템(koreanHolidays, workingDays) 테스트 추가
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
 * <GanttChart
 *   tasks={tasks}
 *   onTaskClick={(id) => console.log(id)}
 * />
 * ```
 *
 * @param props - 컴포넌트 속성
 * @param props.tasks - 표시할 작업 목록
 * @param props.onTaskClick - 작업 클릭 시 콜백
 */
export function GanttChart(props: GanttChartProps) {
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

*이 문서는 코드 분석 자동화 도구를 통해 생성되었으며, 2026-02-10 정확성 교정이 완료되었습니다.*
