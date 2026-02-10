# apps/web 상세 분석

> **분석일**: 2026-02-10
> **대상**: `apps/web` (Next.js 16 + React 19)

---

## 1. 아키텍처 개요

### 1.1 디렉토리 구조

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 인증 관련 페이지
│   ├── (dashboard)/        # 대시보드 페이지
│   ├── api/                # API 라우트
│   │   ├── gemini/         # Gemini AI 통합
│   │   └── ...             # 기타 API
│   └── layout.tsx          # 루트 레이아웃
├── components/
│   ├── buildings/          # 빌딩 관련 컴포넌트 (고복잡도)
│   ├── projects/           # 프로젝트 관리
│   ├── file-search/        # 파일 검색/챗봇
│   ├── common/             # 공통 컴포넌트
│   └── ui/                 # shadcn/ui 기반 컴포넌트
├── lib/
│   ├── supabase/           # Supabase 클라이언트
│   │   ├── client.ts       # 클라이언트 사이드
│   │   ├── server.ts       # 서버 사이드 ⚠️ 캐시 이슈
│   │   └── middleware.ts   # 미들웨어
│   ├── services/           # 데이터 서비스 레이어
│   ├── hooks/              # 커스텀 훅
│   ├── types/              # TypeScript 타입 정의
│   ├── utils/              # 유틸리티 함수
│   ├── api/                # API 헬퍼 (withValidation 등)
│   └── data/               # 정적 데이터/상수
└── styles/                 # 글로벌 스타일
```

### 1.2 데이터 흐름

```
[사용자] → [컴포넌트] → [커스텀 훅] → [서비스 레이어] → [Supabase]
                ↑                            ↓
           [Zustand Store]            [localStorage] ← ⚠️ 분산 저장
```

### 1.3 상태 관리 패턴

| 상태 유형 | 관리 방식 | 위치 |
|----------|----------|------|
| 서버 상태 | React Query / SWR | `services/` |
| UI 상태 | useState / useReducer | 컴포넌트 내부 |
| 전역 UI | Zustand | `store/` |
| 영속 데이터 | Supabase + localStorage | `services/` |

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

**문제점**:
- 클라이언트/서버 간 캐시 동기화 부재
- React Query 캐시와 로컬 상태 불일치 가능
- Supabase 실시간 구독과 캐시 업데이트 분리

**권장 수정**:
- React Query `invalidateQueries` 일관성 있게 적용
- Supabase Realtime 구독 시 캐시 자동 갱신

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

### 2.6 [LOW] 테스트 부재

**현황**:
- `apps/web`에 테스트 파일 거의 없음
- CI/CD 파이프라인에 테스트 단계 미확인

**권장**:
- 핵심 유틸리티 함수 단위 테스트 추가
- 주요 API 라우트 통합 테스트
- Playwright를 활용한 E2E 테스트

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

### 3.2 1,000+ LOC 파일 (추정)

| 파일 | 복잡도 원인 |
|------|-------------|
| `DataInputPage.tsx` | 대규모 폼 처리 |
| `PlannedUnitRatePage.tsx` | 복잡한 테이블 렌더링 |
| `TradeInputCell.tsx` | 인라인 편집 로직 |

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

## 4. 긍정적인 부분

### 4.1 잘 구현된 영역

- ✅ **ESLint 클린**: errors: 0, warnings: 0
- ✅ **API 검증 미들웨어**: `withValidation` 패턴 구현됨
- ✅ **에러 타입 시스템**: `lib/types/error.ts` 잘 구조화됨
- ✅ **로거 유틸리티**: 일관된 로깅 패턴
- ✅ **Zustand 셀렉터 최적화**: `useShallow` 활용

### 4.2 재사용 가능한 패턴

```typescript
// lib/api/withValidation.ts - 다른 프로젝트에서도 재사용 가능
export function withValidation<T extends z.ZodSchema>(
  config: ValidationConfig<T>,
  handler: ValidatedHandler<z.infer<T>>
)
```

---

## 5. 다음 단계

1. **Phase 1**: 인증 캐시 버그 수정 (`server.ts`)
2. **Phase 2**: 고복잡도 컴포넌트 분할 시작
3. **Phase 3**: 테스트 커버리지 확대

자세한 리팩토링 로드맵은 [04-refactoring-roadmap.md](./04-refactoring-roadmap.md) 참조.

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었습니다.*
