# 아키텍처 이슈 및 개선안

> **분석일**: 2026-02-10
> **대상**: contech-dx 전체 시스템

---

## 1. 시스템 구성도

### 1.1 현재 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Next.js 16 App                              │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │   │
│  │  │   Pages       │  │  Components   │  │  sa-gantt-lib │       │   │
│  │  │ (container)/  │  │  (buildings/) │  │  (package)    │       │   │
│  │  │ (fullscreen)/ │  │               │  │               │       │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘       │   │
│  │          │                  │                  │                │   │
│  │          ▼                  ▼                  ▼                │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │                   State Management                       │   │   │
│  │  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐    │   │   │
│  │  │  │  Zustand    │  │ MemoryCache  │  │ localStorage│    │   │   │
│  │  │  │  (UI State) │  │ (TTL Cache)  │  │ (Persist)   │    │   │   │
│  │  │  │  ^5.0.8     │  │ (190 LOC)    │  │             │    │   │   │
│  │  │  └─────────────┘  └──────────────┘  └─────────────┘    │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      API Routes (app/api/)                       │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │   │
│  │  │  /api/gemini  │  │  /api/auth    │  │  /api/...     │       │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Supabase                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │  PostgreSQL   │  │     Auth      │  │   Storage     │               │
│  │  (Database)   │  │ (JWT/Session) │  │   (Files)     │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
│          │                  │                                           │
│          ▼                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Row Level Security (RLS)                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         External Services                                │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     Google Gemini API                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 데이터 흐름도

```
[사용자 인터랙션]
        │
        ▼
┌───────────────────┐
│    Component      │ ── useState / useReducer (로컬 UI 상태)
│   (React 19)      │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Custom Hooks    │ ── useGanttStore (Zustand ^5.0.8)
│                   │ ── DataService (MemoryCache 연동)
└───────────────────┘
        │
        ├─────────────────────────────┐
        ▼                             ▼
┌───────────────────┐       ┌───────────────────┐
│  Service Layer    │       │   localStorage    │ ⚠️ 분산 저장
│  (lib/services/)  │       │                   │
│  + MemoryCache    │       └───────────────────┘
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Supabase SDK    │ ── Auth Session 관리
│                   │ ── RLS 기반 데이터 접근
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   PostgreSQL      │
│   (Supabase)      │
└───────────────────┘
```

---

## 2. 아키텍처 레벨 이슈

### 2.1 데이터 저장소 분산

**현황**:
```
데이터 저장 위치
├── Supabase PostgreSQL
│   ├── projects
│   ├── buildings
│   ├── team_members
│   └── ...
├── localStorage ⚠️
│   ├── contech_process_plan_{buildingId}
│   └── 기타 캐시 데이터
├── Memory (Zustand ^5.0.8)
│   └── UI 상태
└── Memory (MemoryCache TTL)
    ├── projectsCache (DEFAULT_TTL: 5분)
    ├── profilesCache (DEFAULT_TTL: 5분)
    └── postsCache (SHORT_TTL: 1분)
```

**문제점**:
- 공정 계획 데이터가 localStorage에만 저장됨
- 디바이스 간 동기화 불가
- 데이터 유실 위험 (브라우저 캐시 삭제 시)

**예시 코드** (`BuildingProcessPlanPage.tsx:90-100`):
```typescript
const saveToLocalStorage = useCallback((buildingId: string) => {
  const storageKey = `contech_process_plan_${buildingId}`;
  const currentPlan = processPlans.get(buildingId);
  if (!currentPlan) return;

  setIsSaving(true);
  try {
    localStorage.setItem(storageKey, JSON.stringify(currentPlan));
    // ... Supabase에는 저장하지 않음
  }
});
```

**권장 개선안**:
```
Phase 1: 하이브리드 저장 (현재 + Supabase 백업)
Phase 2: Supabase 우선, localStorage 캐시용
Phase 3: 완전 Supabase 이관 + 오프라인 지원 (선택)
```

---

### 2.2 캐시 전략 (현재 MemoryCache 기반)

**현재 구현**: `lib/services/cache.ts` (190 LOC)

```
┌─ MemoryCache<T> 구조 ──────────────────────────────────┐
│                                                          │
│  TTL 설정:                                               │
│  ├── DEFAULT_TTL: 5분 (일반 데이터)                      │
│  ├── SHORT_TTL:  1분 (자주 변경되는 데이터)              │
│  └── LONG_TTL:  15분 (정적 데이터)                       │
│                                                          │
│  핵심 메서드:                                            │
│  ├── get(key) → T | null                                │
│  ├── set(key, data, ttl?)                               │
│  ├── getOrFetch(key, fetcher, ttl?) → Promise<T>        │
│  ├── invalidate(key)                                    │
│  ├── invalidateAll()                                    │
│  └── cleanup() → 만료 엔트리 정리                       │
│                                                          │
│  미리 정의된 인스턴스:                                   │
│  ├── projectsCache  (DEFAULT_TTL)                       │
│  ├── profilesCache  (DEFAULT_TTL)                       │
│  └── postsCache     (SHORT_TTL)                         │
│                                                          │
│  키 생성 헬퍼:                                          │
│  └── createCacheKey(prefix, ...params)                  │
└──────────────────────────────────────────────────────────┘
```

**문제점**:
- 서버 메모리 전용 캐시 → 클라이언트와 동기화 없음
- Supabase 실시간 구독과 캐시 무효화 미연동
- 서버 재시작 시 모든 캐시 유실
- 동일 데이터에 대한 클라이언트 측 중복 요청 가능

**권장 개선안**:
```typescript
// Supabase Realtime 구독과 MemoryCache 연동
useEffect(() => {
  const subscription = supabase
    .channel('projects')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      () => {
        projectsCache.invalidateAll();
        // 클라이언트 상태 갱신 트리거
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

---

### 2.3 에러 처리 일관성

**현황**:
```
컴포넌트 A: try-catch + toast
컴포넌트 B: try-catch + console.error
컴포넌트 C: 에러 무시
API Route X: 구조화된 에러 응답
API Route Y: 단순 문자열 에러
```

**문제점**:
- 에러 처리 패턴 불일치
- 사용자 피드백 누락
- 에러 추적 어려움

**권장 개선안**:

```typescript
// 1. 중앙화된 에러 핸들러
// lib/utils/errorHandler.ts
export function handleError(error: unknown, context: string) {
  const apiError = normalizeError(error);

  // 로깅
  logger.error(`[${context}]`, apiError);

  // 사용자 피드백
  if (apiError.userFacing) {
    toast.error(apiError.message);
  }

  // 에러 추적 서비스 (선택)
  // Sentry.captureException(error);

  return apiError;
}

// 2. 컴포넌트에서 사용
const handleSubmit = async () => {
  try {
    await saveData();
  } catch (error) {
    handleError(error, 'DataInputPage.handleSubmit');
  }
};
```

---

### 2.4 인증/인가 미들웨어 분산

**현황**:
```
인증 체크 위치
├── middleware.ts (글로벌)
├── 각 API Route 내부 (중복)
├── 컴포넌트 레벨 (조건부 렌더링)
└── 서비스 레벨 (간접)
```

**문제점**:
- 인증 로직 중복
- 누락 가능성
- 테스트 어려움

**권장 개선안**:

```typescript
// 1. API 미들웨어 표준화
// lib/api/withAuth.ts
export function withAuth<T>(
  handler: (req: NextRequest, user: User) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(req, user);
  };
}

// 2. API Route에서 사용
export const POST = withAuth(async (req, user) => {
  // user가 보장됨
});
```

---

## 3. 기술 부채 목록

### 3.1 High Priority (즉시 해결 권장)

| ID | 부채 | 영향 | 예상 공수 |
|----|------|------|-----------|
| TD-1 | localStorage 데이터 분산 | 데이터 유실 위험 | 3-5일 |
| TD-2 | 인증 캐시 버그 | 세션 불일치 | 1일 |
| TD-3 | API 검증 불완전 | 보안 취약점 | 2일 |

### 3.2 Medium Priority (단기 해결)

| ID | 부채 | 영향 | 예상 공수 |
|----|------|------|-----------|
| TD-4 | 컴포넌트 복잡도 | 유지보수 어려움 | 1-2주 |
| TD-5 | MemoryCache↔Realtime 미연동 | 캐시 불일치 | 3일 |
| TD-6 | 에러 처리 불일치 | 디버깅 어려움 | 2일 |

### 3.3 Low Priority (중기 해결)

| ID | 부채 | 영향 | 예상 공수 |
|----|------|------|-----------|
| TD-7 | 테스트 확대 필요 | 회귀 버그 위험 | 2-4주 |
| TD-8 | 문서화 부족 | 온보딩 지연 | 1주 |
| TD-9 | 성능 최적화 | 대용량 데이터 처리 | 1주 |

---

## 4. 개선 아키텍처 제안

### 4.1 목표 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Presentation Layer                          │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │   │
│  │  │   Pages       │  │  Features     │  │  Shared UI    │       │   │
│  │  │   (Routing)   │  │  (Domain)     │  │  (Components) │       │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      State Layer                                 │   │
│  │  ┌───────────────┐  ┌──────────────┐  ┌───────────────┐        │   │
│  │  │  UI Store     │  │ MemoryCache  │  │ Realtime Sync │        │   │
│  │  │  (Zustand)    │  │ (TTL Cache)  │  │ (Supabase)    │        │   │
│  │  └───────────────┘  └──────────────┘  └───────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Service Layer                               │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │   │
│  │  │  DataService  │  │  Auth Service │  │ Error Handler │       │   │
│  │  │  (Interface)  │  │  (Centralized)│  │ (Centralized) │       │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Supabase (Single Source of Truth)               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL + RLS + Realtime + Auth + Storage                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 핵심 변경 사항

1. **데이터 저장소 통합**: localStorage → Supabase 이관
2. **캐시 레이어 강화**: MemoryCache + Supabase Realtime 연동으로 실시간 무효화
3. **서비스 레이어 중앙화**: DataService 인터페이스 패턴 확대, 인증/에러 처리 통합
4. **도메인 기반 구조**: 기능별 Feature 폴더 구조

---

## 5. 다음 단계

상세 리팩토링 계획은 [04-refactoring-roadmap.md](./04-refactoring-roadmap.md) 참조.

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었으며, 2026-02-10 정확성 교정이 완료되었습니다.*
