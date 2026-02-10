# apps/web 상세 분석

> **분석일**: 2026-02-10
> **대상**: `apps/web` (Next.js 16 + React 19)

---

## 1. 아키텍처 개요

### 1.1 디렉토리 구조

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (container)/        # 인증 컨테이너 레이아웃 (사이드바 포함)
│   │   ├── projects/       # 프로젝트 관리
│   │   ├── admin/          # 관리자 페이지
│   │   ├── posts/          # 게시글
│   │   ├── profile/        # 사용자 프로필
│   │   └── spinner-demo/   # 데모 페이지
│   ├── (fullscreen)/       # 전체화면 레이아웃 (사이드바 없음)
│   │   └── projects/[id]/gantt/  # 전체화면 간트 차트
│   ├── auth/               # 인증 관련 (일반 폴더)
│   ├── login/              # 로그인 페이지
│   ├── signup/             # 회원가입 페이지
│   ├── home/               # 홈 페이지
│   ├── file-search/        # 파일 검색
│   ├── api/                # API 라우트
│   │   ├── gemini/         # Gemini AI 통합
│   │   └── ...             # 기타 API
│   └── layout.tsx          # 루트 레이아웃
├── components/
│   ├── buildings/          # 빌딩 관련 컴포넌트 (고복잡도)
│   ├── projects/           # 프로젝트 관리
│   │   ├── GanttChartPage.tsx       # 간트 차트 페이지 (822 LOC)
│   │   └── FullscreenGanttPage.tsx  # 전체화면 간트 (1,039 LOC)
│   ├── file-search/        # 파일 검색/챗봇
│   ├── common/             # 공통 컴포넌트
│   └── ui/                 # shadcn/ui 기반 컴포넌트
├── lib/
│   ├── supabase/           # Supabase 클라이언트
│   │   ├── client.ts       # 클라이언트 사이드
│   │   ├── server.ts       # 서버 사이드 ⚠️ 캐시 이슈
│   │   └── middleware.ts   # 미들웨어
│   ├── services/           # 데이터 서비스 레이어
│   │   ├── cache.ts        # Custom TTL MemoryCache (190 LOC)
│   │   ├── SupabaseBuildingDataService.ts  # 빌딩 데이터 서비스 (855 LOC)
│   │   ├── SupabaseGanttDataService.ts     # 간트 데이터 서비스 (852 LOC)
│   │   ├── buildings.ts    # 빌딩 서비스
│   │   ├── projects.ts     # 프로젝트 서비스
│   │   └── projectMembers.ts  # 멤버 서비스
│   ├── hooks/              # 커스텀 훅
│   ├── types/              # TypeScript 타입 정의
│   │   └── process-quantity.ts  # SemanticQuantityReference (100 LOC)
│   ├── utils/              # 유틸리티 함수
│   │   ├── process-to-gantt-converter.ts   # 공정→간트 변환 (1,102 LOC)
│   │   ├── quantity-reference.ts           # 물량 참조 (660 LOC)
│   │   ├── process-quantity-resolver.ts    # 물량 해석 (229 LOC)
│   │   ├── quantity-reference-migration.ts # 레거시 마이그레이션 (113 LOC)
│   │   └── process-cell-reference.ts       # 셀 참조 (125 LOC)
│   ├── api/                # API 헬퍼 (withValidation 등)
│   ├── stores/             # Zustand 스토어
│   ├── auth/               # 인증 유틸리티
│   └── data/               # 정적 데이터/상수
├── __tests__/              # 테스트 파일 (11개)
│   ├── components/
│   │   └── Button.test.tsx
│   └── utils/
│       ├── cache.test.ts
│       ├── calculateFormula.test.ts
│       ├── floorIdUtils.test.ts
│       ├── process-calculation.test.ts
│       ├── process-days-calculator.test.ts
│       ├── process-quantity-resolver.test.ts
│       ├── process-to-gantt-converter.test.ts
│       ├── quantity-reference-migration.test.ts
│       ├── quantity-reference.test.ts
│       └── tradeDataHelpers.test.ts
└── styles/                 # 글로벌 스타일
```

### 1.2 데이터 흐름

```
[사용자] → [컴포넌트] → [커스텀 훅] → [서비스 레이어] → [Supabase]
                ↑                            ↓
           [Zustand Store]            [localStorage] ← ⚠️ 분산 저장
                                            ↓
                                    [MemoryCache (TTL)]  ← 서버 캐시
```

### 1.3 상태 관리 패턴

| 상태 유형 | 관리 방식 | 위치 |
|----------|----------|------|
| 서버 상태 | Custom TTL MemoryCache | `services/cache.ts` (190 LOC) |
| UI 상태 | useState / useReducer | 컴포넌트 내부 |
| 전역 UI | Zustand | `stores/` |
| 영속 데이터 | Supabase + localStorage | `services/` |

> **참고**: React Query는 사용하지 않음. 서버 상태 캐싱은 자체 구현한 `MemoryCache<T>` 클래스를 사용하며, TTL 기반 만료(DEFAULT 5분, SHORT 1분, LONG 15분)와 `getOrFetch()` 패턴으로 중복 요청을 방지.

---

## 2. 발견된 이슈

### 2.1 [HIGH] 인증 캐시 버그

**파일**: `apps/web/src/lib/supabase/server.ts`

```typescript
// 문제 코드
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서는 set이 동작하지 않을 수 있음
          }
        },
      },
    }
  );
}
```

**문제점**:
- `cookies()` 호출이 캐시되어 토큰 갱신 시점과 불일치 발생 가능
- 에러 무시(`catch {}`)로 인한 디버깅 어려움

**권장 수정**:
```typescript
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(/* ... */, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (error) {
          // Server Component에서는 정상 동작
          // Route Handler에서만 실패 시 로깅
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Supabase] Cookie set failed:', error);
          }
        }
      },
    },
  });
}
```

---

### 2.2 [HIGH] Gemini API 오버플로우

**파일**: `apps/web/src/app/api/gemini/route.ts` (추정)

**문제점**:
- 대용량 입력 시 토큰 제한 초과
- 컨텍스트 윈도우 관리 부재
- 에러 핸들링 불완전

**권장 수정**:
- 입력 토큰 수 사전 계산
- 청킹(chunking) 전략 도입
- 재시도 로직 및 fallback 구현

---

### 2.3 [MEDIUM] 캐시 일관성 문제

**영향 파일**: `apps/web/src/lib/services/*.ts`

**현재 구현**:
- `MemoryCache<T>` 클래스 (190 LOC) 기반 TTL 캐시
- `getOrFetch()` 패턴으로 캐시 미스 시 자동 fetch
- `invalidate()` / `invalidateAll()`로 캐시 무효화
- 미리 정의된 인스턴스: `projectsCache`, `profilesCache`, `postsCache`

**문제점**:
- 클라이언트/서버 간 캐시 동기화 부재 (MemoryCache는 서버 메모리 전용)
- Supabase 실시간 구독과 캐시 업데이트 미연동
- 다른 사용자의 변경사항이 TTL 만료 전까지 반영되지 않음

**권장 수정**:
- Supabase Realtime 구독 시 관련 캐시 `invalidate()` 호출
- 클라이언트 측 캐시 레이어 추가 검토
- 중요 데이터는 `SHORT_TTL`(1분) 적용 확대

---

### 2.4 [MEDIUM] API 검증 미들웨어 적용 불완전

**파일**: `apps/web/src/lib/api/withValidation.ts`

`withValidation` 미들웨어가 잘 구현되어 있으나, 일부 API 라우트에서 미사용:

```typescript
// 좋은 예시 (withValidation 사용)
export const POST = withValidation(
  { schema: postSchema, source: 'body' },
  async (req, data) => {
    // 타입 안전한 data 사용
  }
);

// 개선 필요 (직접 파싱)
export async function POST(req: Request) {
  const body = await req.json(); // 검증 없음
}
```

**권장 수정**:
- 모든 API 라우트에 `withValidation` 적용
- 공통 스키마 정의 및 재사용

---

### 2.5 [MEDIUM] 타입 캐스팅 과다

**문제점**:
- `as` 키워드를 통한 타입 단언 과다 사용
- 런타임 타입 불일치 위험

**예시**:
```typescript
// 개선 필요
const data = response.data as SomeType;

// 권장
const data = validateSchema.parse(response.data);
```

---

### 2.6 [LOW] 테스트 현황

**현황**: `__tests__/` 디렉토리에 **11개 테스트 파일** 존재

| 카테고리 | 파일 | 대상 |
|----------|------|------|
| 컴포넌트 | `Button.test.tsx` | Button UI 컴포넌트 |
| 유틸 | `cache.test.ts` | MemoryCache TTL 캐시 |
| 유틸 | `calculateFormula.test.ts` | 수식 계산 |
| 유틸 | `floorIdUtils.test.ts` | 층 ID 유틸 |
| 유틸 | `process-calculation.test.ts` | 공정 계산 |
| 유틸 | `process-days-calculator.test.ts` | 공정일 계산기 |
| 유틸 | `process-quantity-resolver.test.ts` | 물량 해석 |
| 유틸 | `process-to-gantt-converter.test.ts` | 간트 변환기 |
| 유틸 | `quantity-reference-migration.test.ts` | 레거시 마이그레이션 |
| 유틸 | `quantity-reference.test.ts` | 물량 참조 |
| 유틸 | `tradeDataHelpers.test.ts` | 공종 데이터 헬퍼 |

**분석**:
- 핵심 비즈니스 로직(공정 계산, 물량 해석, 간트 변환) 위주의 테스트 구성
- 컴포넌트 테스트는 Button 1건만 존재
- API 라우트 통합 테스트 부재
- E2E 테스트 부재

**권장**:
- 기존 테스트를 기반으로 커버리지 확대
- API 라우트 통합 테스트 추가
- 주요 페이지 컴포넌트 테스트 추가

---

### 2.7 [LOW] 하드코딩된 값

**문제점**:
- 일부 상수가 코드에 직접 하드코딩됨
- 환경별 설정 분리 불완전

**권장**:
- 환경 변수 또는 설정 파일로 분리
- `lib/constants/` 디렉토리 활용

---

### 2.8 [LOW] Props Drilling

**영향 파일**: `components/buildings/` 내 컴포넌트들

**문제점**:
- 깊은 컴포넌트 트리에서 props 전달 과다
- 중간 컴포넌트가 불필요하게 props에 의존

**권장**:
- React Context 또는 Zustand 활용
- 컴포넌트 구조 재설계

---

## 3. 고복잡도 파일 목록

### 3.1 2,000+ LOC 파일

| 파일 | LOC | 복잡도 원인 |
|------|-----|-------------|
| `BasementProcessPlanPage.tsx` | 2,155 | 다중 상태, 복잡한 계산 로직 |
| `BuildingProcessPlanPage.tsx` | 2,068 | 위와 동일한 패턴 |

### 3.2 1,000+ LOC 파일

| 파일 | LOC | 복잡도 원인 |
|------|-----|-------------|
| `process-to-gantt-converter.ts` | 1,102 | 핵심 변환 로직, 물량 해석, 특수 행 처리 |
| `FullscreenGanttPage.tsx` | 1,039 | 전체화면 간트 뷰, 복합 상태 관리 |
| `SupabaseBuildingDataService.ts` | 855 | CRUD + RPC + 캐시 연동 |
| `SupabaseGanttDataService.ts` | 852 | 간트 데이터 CRUD + 동기화 |
| `GanttChartPage.tsx` | 822 | 간트 차트 페이지 통합 |
| `quantity-reference.ts` | 660 | 물량 참조 시스템 |

### 3.3 분할 권장 패턴

```
현재: BasementProcessPlanPage.tsx (2,155 LOC)
      ├── 상태 관리 (~300 LOC)
      ├── 계산 로직 (~500 LOC)
      ├── 이벤트 핸들러 (~400 LOC)
      └── JSX 렌더링 (~950 LOC)

권장:
├── BasementProcessPlanPage.tsx (~200 LOC) - 컨테이너
├── hooks/
│   ├── useBasementProcessPlan.ts (~300 LOC) - 상태 관리
│   └── useProcessCalculation.ts (~500 LOC) - 계산 로직
├── components/
│   ├── ProcessPlanHeader.tsx (~150 LOC)
│   ├── ProcessPlanTable.tsx (~400 LOC)
│   └── ProcessPlanActions.tsx (~200 LOC)
└── utils/
    └── basementCalculations.ts (~300 LOC) - 순수 함수
```

---

## 4. DataService 아키텍처

### 4.1 개요

`apps/web`은 **추상 인터페이스 기반 DataService 패턴**을 사용하여, 저장소를 교체 가능하게 설계:

```
[컴포넌트/훅] → [DataService 인터페이스] → [Supabase 구현체]
                                            └→ [다른 구현체 교체 가능]
```

### 4.2 주요 DataService 구현체

| 서비스 | 파일 | LOC | 역할 |
|--------|------|-----|------|
| 빌딩 데이터 | `SupabaseBuildingDataService.ts` | 855 | 빌딩 CRUD, RPC 호출, 데이터 동기화 |
| 간트 데이터 | `SupabaseGanttDataService.ts` | 852 | 간트 차트 데이터 CRUD, 태스크/마일스톤 관리 |

### 4.3 캐시 연동

DataService들은 `MemoryCache`와 연동하여 서버 사이드 캐싱을 수행:

```typescript
// 서비스에서 캐시 활용 패턴
const data = await projectsCache.getOrFetch(
  createCacheKey('project', projectId),
  () => supabase.from('projects').select('*').eq('id', projectId)
);
```

---

## 5. 물량 해석 시스템

### 5.1 개요

건설 프로젝트의 **물량(수량) 데이터**를 해석하고 참조하는 시스템으로, Excel 셀 주소 기반 레거시 방식에서 **SemanticQuantityReference** 기반으로 마이그레이션 중.

### 5.2 핵심 파일

| 파일 | LOC | 역할 |
|------|-----|------|
| `process-quantity.ts` (types) | 100 | SemanticQuantityReference 타입 정의 |
| `quantity-reference.ts` | 660 | 물량 참조 핵심 로직 |
| `process-quantity-resolver.ts` | 229 | 물량 값 해석/계산 |
| `quantity-reference-migration.ts` | 113 | 레거시→Semantic 마이그레이션 |
| `process-cell-reference.ts` | 125 | 셀 참조 유틸 |

### 5.3 주요 타입

```typescript
// SemanticQuantityReference: Excel 셀 주소 대신 의미 기반 참조
interface SemanticQuantityReference {
  tradeField: TradeFieldKey;    // 'gangForm' | 'rebar' | 'concrete' 등
  subField: TradeSubFieldKey;   // 'areaM2' | 'ton' | 'volumeM3'
  sourceType: QuantitySourceType; // 'category' | 'floor' | 'combined'
}

// TradeFieldKey: 공종별 필드 매핑
type TradeFieldKey = 'gangForm' | 'alForm' | 'formwork' | 'euroForm'
                   | 'stripClean' | 'rebar' | 'concrete';
```

---

## 6. 긍정적인 부분

### 6.1 잘 구현된 영역

- ✅ **ESLint 클린**: errors: 0, warnings: 0
- ✅ **API 검증 미들웨어**: `withValidation` 패턴 구현됨
- ✅ **에러 타입 시스템**: `lib/types/error.ts` 잘 구조화됨
- ✅ **로거 유틸리티**: 일관된 로깅 패턴
- ✅ **Zustand 셀렉터 최적화**: `useShallow` 활용
- ✅ **Custom TTL Cache**: `MemoryCache<T>` (190 LOC) - getOrFetch, invalidate 패턴
- ✅ **DataService 패턴**: 추상 인터페이스 기반 저장소 교체 가능 구조
- ✅ **테스트 기반**: 핵심 비즈니스 로직 11개 테스트 파일 존재
- ✅ **물량 해석 리팩토링**: SemanticQuantityReference 도입으로 레거시 탈피 진행 중

### 6.2 재사용 가능한 패턴

```typescript
// lib/api/withValidation.ts - 다른 프로젝트에서도 재사용 가능
export function withValidation<T extends z.ZodSchema>(
  config: ValidationConfig<T>,
  handler: ValidatedHandler<z.infer<T>>
)

// lib/services/cache.ts - 범용 TTL 메모리 캐시
export class MemoryCache<T> {
  async getOrFetch(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>
  invalidate(key: string): void
  invalidateAll(): void
}
```

---

## 7. 다음 단계

1. **Phase 1**: 인증 캐시 버그 수정 (`server.ts`)
2. **Phase 2**: 고복잡도 컴포넌트 분할 시작 (2,000+ LOC 파일 우선)
3. **Phase 3**: 기존 11개 테스트 기반으로 커버리지 확대
4. **Phase 4**: MemoryCache + Supabase Realtime 캐시 연동

자세한 리팩토링 로드맵은 [04-refactoring-roadmap.md](./04-refactoring-roadmap.md) 참조.

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었으며, 2026-02-10 정확성 교정이 완료되었습니다.*
