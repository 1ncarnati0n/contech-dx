# ConTech-DX 코드 리뷰 보고서

> **리뷰 일자**: 2026-01-20
> **브랜치**: dev
> **리뷰어**: Claude Code (AI Assistant)

---

## 목차


1. [프로젝트 개요](#1-프로젝트-개요)
2. [아키텍처 분석](#2-아키텍처-분석)
3. [보안 이슈](#3-보안-이슈)
4. [서비스 레이어 분석](#4-서비스-레이어-분석)
5. [컴포넌트 분석](#5-컴포넌트-분석)
6. [타입 시스템 분석](#6-타입-시스템-분석)
7. [테스트 커버리지](#7-테스트-커버리지)
8. [성능 분석](#8-성능-분석)
9. [코드 품질 메트릭](#9-코드-품질-메트릭)
10. [개선 권장사항](#10-개선-권장사항)


---

## 1. 프로젝트 개요

### 1.1 기술 스택


| 카테고리 | 기술 | 버전 |
|----------|------|------|
| **프레임워크** | Next.js (App Router) | 16.0.10 |
| **언어** | TypeScript | 5.x |
| **UI 라이브러리** | React | 19.2.0 |
| **스타일링** | Tailwind CSS | 4.x |
| **UI 컴포넌트** | Radix UI | - |
| **애니메이션** | Framer Motion | 12.23.24 |
| **폼 처리** | React Hook Form + Zod | 7.66.1 / 4.1.12 |
| **백엔드** | Supabase (PostgreSQL) | 2.80.0 |
| **AI** | Google Generative AI (Gemini) | 0.24.1 |
| **테스트** | Jest + React Testing Library | 29.7.0 / 16.3.1 |


### 1.2 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (container)/        # 인증된 라우트 그룹
│   ├── api/                # API 엔드포인트 (9개)
│   ├── auth/               # 인증 콜백
│   ├── file-search/        # AI 파일 검색
│   └── home/               # 홈 페이지
│
├── components/             # React 컴포넌트 (60+ 파일)
│   ├── ui/                 # 디자인 시스템 (13개)
│   ├── auth/               # 인증 관련
│   ├── buildings/          # 동 관리 (19개 파일, 193KB+)
│   ├── dashboard/          # 대시보드
│   └── ...
│
├── lib/                    # 유틸리티 및 서비스
│   ├── services/           # 비즈니스 로직 (18개)
│   ├── hooks/              # 커스텀 훅 (3개)
│   ├── supabase/           # Supabase 클라이언트
│   ├── permissions/        # 권한 시스템
│   ├── types.ts            # 타입 정의 (740줄)
│   └── constants.ts        # 상수 정의 (200줄)
│
└── __tests__/              # 테스트 파일 (2개)
```

### 1.3 주요 기능

- **사용자 인증**: Supabase Auth 기반 OAuth/이메일 인증
- **역할 기반 접근 제어**: 4단계 (admin > main_user > vip_user > user)
- **프로젝트 관리**: 프로젝트 CRUD 및 팀원 관리
- **동(Building) 관리**: 복잡한 건축 데이터 관리 (층, 공종, 물량)
- **AI 문서 검색**: Gemini 2.0 기반 문서 업로드 및 검색
- **대시보드**: KPI 추적, 진행률 모니터링

---

## 2. 아키텍처 분석

### 2.1 레이어 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer                          │
│  (components/, app/)                                │
├─────────────────────────────────────────────────────┤
│                Business Logic Layer                 │
│  (lib/services/, lib/hooks/)                        │
├─────────────────────────────────────────────────────┤
│                  Data Layer                         │
│  (lib/supabase/, Supabase RLS)                      │
└─────────────────────────────────────────────────────┘
```

### 2.2 강점

| 항목 | 설명 |
|------|------|
| **명확한 레이어 분리** | UI, 비즈니스 로직, 데이터 레이어가 잘 분리됨 |
| **도메인 기반 구조** | 컴포넌트가 도메인별로 그룹화 (auth, buildings, dashboard) |
| **중앙화된 타입** | `types.ts`에 모든 타입 정의 집중 |
| **권한 시스템 모듈화** | shared/server/client로 분리된 권한 로직 |
| **서버/클라이언트 분리** | Server Components와 Client Components 적절히 구분 |

### 2.3 약점

| 항목 | 설명 | 위치 |
|------|------|------|
| **비대한 모듈** | buildings 모듈이 19개 파일, 193KB+ | `src/components/buildings/` |
| **대형 컴포넌트** | 단일 컴포넌트가 700줄+ | `BuildingBasicInfo.tsx` |
| **서비스 불일관성** | 에러 처리 패턴이 서비스마다 다름 | `lib/services/` |
| **테스트 부재** | 비즈니스 로직에 대한 테스트 없음 | - |

### 2.4 아키텍처 다이어그램

```
[Client Browser]
       │
       ▼
┌──────────────┐
│   Next.js    │
│  Middleware  │ ← 세션 검증, 라우트 보호
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  App Router  │────▶│    API      │
│   (Pages)    │     │   Routes    │
└──────┬───────┘     └──────┬───────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  Components  │     │   Services   │
│   (React)    │     │ (Business)   │
└──────┬───────┘     └──────┬───────┘
       │                    │
       └────────┬───────────┘
                │
                ▼
       ┌──────────────┐
       │   Supabase   │
       │ (PostgreSQL) │
       └──────────────┘
```

---

## 3. 보안 이슈

### 3.1 Critical (즉시 수정 필요)

#### 3.1.1 Gemini API 인증 누락

**심각도**: 🔴 Critical
**신뢰도**: 95%

**영향받는 파일**:
- `src/app/api/gemini/list-stores/route.ts`
- `src/app/api/gemini/create-store/route.ts`
- `src/app/api/gemini/delete-store/route.ts`
- `src/app/api/gemini/get-store/route.ts`
- `src/app/api/gemini/list-files/route.ts`
- `src/app/api/gemini/upload-file/route.ts`
- `src/app/api/gemini/delete-file/route.ts`
- `src/app/api/gemini/search/route.ts`

**문제**: 모든 Gemini API 라우트에 인증 체크가 없어 누구나 접근 가능

**현재 코드** (`create-store/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  const { displayName } = await request.json();
  // ❌ 인증 체크 없음
  if (!displayName) {
    return NextResponse.json({ error: '...' }, { status: 400 });
  }
  // API 호출 진행...
}
```

**권장 수정**:
```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ✅ 인증 체크 추가
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { displayName } = await request.json();
  // ...
}
```

**영향**:
- 무인가 사용자의 API 호출 가능
- Gemini API 할당량 남용
- 민감한 문서 데이터 노출 위험

---

#### 3.1.2 CSRF 보호 부재

**심각도**: 🔴 Critical
**신뢰도**: 83%

**영향받는 파일**: 모든 POST/DELETE API 라우트

**문제**: 상태 변경 요청에 CSRF 토큰 검증 없음

**권장 수정**:
```typescript
// 커스텀 헤더 검증 방식
export async function POST(request: NextRequest) {
  const customHeader = request.headers.get('X-Requested-With');
  if (customHeader !== 'XMLHttpRequest') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }
  // ...
}
```

---

#### 3.1.3 Rate Limiting 부재

**심각도**: 🔴 Critical
**신뢰도**: 82%

**문제**: API 요청에 대한 속도 제한 없음

**영향**:
- 브루트포스 공격 가능
- API 할당량 고갈
- DoS 공격 취약

**권장**: Upstash Rate Limit 또는 Vercel Edge Config 활용

---

### 3.2 Important (조속히 수정)

#### 3.2.1 서비스 함수 인증 체크 누락

**심각도**: 🟠 Important
**신뢰도**: 80%

**영향받는 파일**:
- `src/lib/services/projects.ts`: `updateProject()`, `deleteProject()`
- `src/lib/services/buildings.ts`: 대부분의 mutation 함수

**문제**: RLS에만 의존하고 애플리케이션 레벨 검증 없음

**현재 코드** (`projects.ts:141-170`):
```typescript
export async function updateProject(id: string, updates: UpdateProjectDTO): Promise<Project> {
  const supabase = createClient();
  // ❌ 인증 체크 없음 - RLS에만 의존
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates })
    .eq('id', id)
    .select()
    .maybeSingle();
  // ...
}
```

---

#### 3.2.2 Auth Callback 에러 처리 없음

**심각도**: 🟠 Important
**신뢰도**: 81%

**파일**: `src/app/auth/callback/route.ts`

**현재 코드**:
```typescript
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code); // ❌ 에러 무시
  }

  return NextResponse.redirect(`${origin}/posts`);
}
```

**권장 수정**:
```typescript
export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const origin = requestUrl.origin;

    if (!code || typeof code !== 'string') {
      return NextResponse.redirect(`${origin}/login?error=invalid_code`);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback failed:', error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    return NextResponse.redirect(`${origin}/posts`);
  } catch (error) {
    return NextResponse.redirect(`${origin}/login?error=server_error`);
  }
}
```

---

#### 3.2.3 입력 유효성 검사 부족

**심각도**: 🟠 Important
**신뢰도**: 84%

**영향받는 파일**: Gemini API 라우트들

**문제**: 입력 길이 제한, 형식 검증 없음

**권장**: Zod 스키마 적용
```typescript
import { z } from 'zod';

const createStoreSchema = z.object({
  displayName: z.string().min(1).max(100).trim(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createStoreSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  // ...
}
```

---

#### 3.2.4 쿠키 보안 속성 미확인

**심각도**: 🟠 Important
**신뢰도**: 90%

**파일**: `src/lib/supabase/middleware.ts`, `src/lib/supabase/server.ts`

**권장**: 명시적 보안 속성 설정
```typescript
response.cookies.set({
  name,
  value,
  ...options,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
});
```

---

#### 3.2.5 민감 정보 로깅

**심각도**: 🟡 Medium
**신뢰도**: 80%

**파일**: `src/lib/supabase/middleware.ts:80`

**현재 코드**:
```typescript
console.log('[Middleware] path:', path, 'user:', user?.email ?? 'null');
```

**권장**: 환경별 로깅 또는 사용자 ID만 로깅
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Middleware] path:', path, 'userId:', user?.id ?? 'null');
}
```

---

### 3.3 보안 점수 요약

| 영역 | 점수 | 비고 |
|------|------|------|
| 인증 흐름 | 6/10 | 세션 처리 양호, 콜백 개선 필요 |
| 인가 검사 | 3/10 | 9개 API 중 1개만 인증 있음 |
| 세션 관리 | 7/10 | Supabase SSR 잘 활용 |
| API 보호 | 2/10 | 거의 무방비 |
| 입력 검증 | 4/10 | 기본 검사만 존재 |
| **종합** | **3.5/10** | |

---

## 4. 서비스 레이어 분석

### 4.1 서비스 파일 목록

| 파일 | 크기 | 주요 기능 |
|------|------|----------|
| `buildings.ts` | 36KB | 동 관리 (가장 복잡) |
| `projects.ts` | - | 프로젝트 CRUD |
| `projectMembers.ts` | - | 팀원 관리 |
| `posts.ts` / `posts.client.ts` | - | 게시글 관리 |
| `comments.ts` | - | 댓글 관리 |
| `users.ts` / `users.client.ts` | - | 사용자 관리 |
| `gemini.ts` | - | AI 검색 서비스 |
| `cache.ts` | - | TTL 기반 캐싱 |
| `unitRates.ts` | - | 단가 관리 |

### 4.2 Critical 이슈

#### 4.2.1 Deprecated `.substr()` 메서드 사용

**심각도**: 🔴 Critical
**신뢰도**: 100%

**영향받는 파일**:
- `src/lib/services/buildings.ts` (17+ 위치)
- `src/lib/services/unitRates.ts` (1 위치)

**현재 코드**:
```typescript
id: `building-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
```

**문제**:
- `.substr()`는 ES2024에서 deprecated
- `Math.random()` 기반 ID는 충돌 위험

**권장 수정**:
```typescript
// Option 1: .slice() 사용
id: `building-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,

// Option 2: crypto.randomUUID() 사용 (권장)
id: `building-${crypto.randomUUID()}`,
```

---

#### 4.2.2 안전하지 않은 JSON.parse

**심각도**: 🔴 Critical
**신뢰도**: 90%

**파일**: `src/lib/services/gemini.ts:137, 140`

**현재 코드**:
```typescript
xhr.addEventListener('load', () => {
  if (xhr.status >= 200 && xhr.status < 300) {
    const data = JSON.parse(xhr.responseText);  // ❌ 파싱 실패 시 예외
    resolve(data.file);
  } else {
    const data = JSON.parse(xhr.responseText);  // ❌ 파싱 실패 시 예외
    reject(new Error(data.error || '파일 업로드 실패'));
  }
});
```

**권장 수정**:
```typescript
xhr.addEventListener('load', () => {
  try {
    const data = JSON.parse(xhr.responseText);
    if (xhr.status >= 200 && xhr.status < 300) {
      resolve(data.file);
    } else {
      reject(new Error(data.error || '파일 업로드 실패'));
    }
  } catch (parseError) {
    reject(new Error('서버 응답을 파싱할 수 없습니다.'));
  }
});
```

---

#### 4.2.3 캐시 Race Condition

**심각도**: 🔴 Critical
**신뢰도**: 85%

**파일**: `src/lib/services/buildings.ts:479-481`

**현재 코드** (`deleteBuilding`):
```typescript
export async function deleteBuilding(buildingId: string, projectId: string): Promise<void> {
  await deleteBuildingFromStorage(buildingId);

  // ❌ 캐시가 만료되었으면 빈 배열로 저장됨
  const buildings = getCacheEntry(projectId) || [];
  const filtered = buildings.filter(b => b.id !== buildingId);
  setCacheEntry(projectId, filtered);
}
```

**문제**: 캐시 만료 시 모든 빌딩이 사라지는 것처럼 보임

**권장 수정**:
```typescript
export async function deleteBuilding(buildingId: string, projectId: string): Promise<void> {
  await deleteBuildingFromStorage(buildingId);

  // ✅ 캐시 무효화만 수행 - 다음 읽기에서 재구성
  invalidateCache(projectId);
}
```

---

### 4.3 Important 이슈

#### 4.3.1 에러 처리 패턴 불일관

**심각도**: 🟠 Important
**신뢰도**: 85%

**현재 패턴 비교**:

| 서비스 | 패턴 | 예시 |
|--------|------|------|
| `posts.client.ts` | 객체 반환 | `return { post, error }` |
| `projects.ts` | 예외 발생 | `throw new Error(...)` |
| `gemini.ts` | 예외 발생 | `throw new Error(...)` |

**권장**: `ApiResponse<T>` 타입으로 통일

```typescript
// types.ts에 이미 정의된 타입 활용
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// 모든 서비스에 적용
export async function createProject(project: CreateProjectDTO): Promise<ApiResponse<Project>> {
  const { data, error } = await supabase.from('projects').insert(...);

  if (error) {
    return { success: false, error: { message: error.message } };
  }

  return { success: true, data };
}
```

---

#### 4.3.2 에러 로깅 누락

**심각도**: 🟠 Important
**신뢰도**: 85%

**영향받는 파일**:
- `buildings.ts`: lines 362, 497, 530, 562, 567, 602
- `gemini.ts`: lines 20, 43, 63, 80, 99, 180
- `projectMembers.ts`: lines 173, 217, 248, 294, 350

**문제**: 에러 발생 시 컨텍스트 없이 throw만 수행

**현재 코드**:
```typescript
if (!building) {
  throw new Error('Building not found');  // ❌ 컨텍스트 없음
}
```

**권장 수정**:
```typescript
if (!building) {
  console.error('Building not found:', { buildingId, projectId });
  throw new Error('Building not found');
}
```

---

#### 4.3.3 불일관한 캐시 무효화

**심각도**: 🟠 Important
**신뢰도**: 80%

**파일**: `src/lib/services/projects.ts`

**현재 코드**:
```typescript
// 모든 프로젝트 캐시를 무효화 - 과도함
projectsCache.invalidateAll();  // lines 132, 167, 186
```

**문제**: 하나의 프로젝트 변경 시 모든 캐시 삭제

**권장**: 선택적 무효화
```typescript
projectsCache.invalidate(CACHE_KEYS.PROJECT_BY_ID(id));
projectsCache.invalidate(CACHE_KEYS.ALL_PROJECTS);
```

---

### 4.4 서비스 레이어 품질 요약

| 지표 | 상태 |
|------|------|
| deprecated 메서드 사용 | 17+ 위치 |
| 에러 로깅 없는 throw | 20+ 위치 |
| 안전하지 않은 JSON.parse | 2 위치 |
| 캐시 관련 버그 | 2개 |
| 불일관한 패턴 | 다수 |

---

## 5. 컴포넌트 분석

### 5.1 컴포넌트 구조

```
components/
├── ui/                 # 기본 UI (13개)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Dialog.tsx
│   ├── Form.tsx
│   ├── Input.tsx
│   └── ...
├── auth/               # 인증 관련
├── buildings/          # 동 관리 (19개, 가장 복잡)
├── dashboard/          # 대시보드
├── posts/              # 게시글
├── comments/           # 댓글
├── projects/           # 프로젝트
└── layout/             # 레이아웃
```

### 5.2 Critical 이슈

#### 5.2.1 메모리 누수 - setTimeout Cleanup

**심각도**: 🔴 Critical
**신뢰도**: 90%

**파일**: `src/components/buildings/BuildingBasicInfo.tsx:329-467, 712-719`

**현재 코드**:
```typescript
// Line 354: 타임아웃 설정
saveTimeoutRef.current = setTimeout(async () => {
  setIsSaving(true);
  // ... 긴 비동기 작업
}, 500);

// Line 713-719: cleanup이 unmount에서만 실행
useEffect(() => {
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, []); // ❌ 빈 의존성 - unmount에서만 정리
```

**문제**: 컴포넌트 unmount 중 state 업데이트 시도 가능

**권장 수정**:
```typescript
const autoSave = useCallback(() => {
  // 이전 타임아웃 정리
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  saveTimeoutRef.current = setTimeout(async () => {
    // mounted 체크 추가
    if (!isMountedRef.current) return;
    setIsSaving(true);
    // ...
  }, 500);
}, [/* dependencies */]);
```

---

#### 5.2.2 Race Condition - 비동기 루프

**심각도**: 🔴 Critical
**신뢰도**: 85%

**파일**: `src/components/buildings/BuildingBasicInfoPage.tsx:222-300`

**현재 코드** (`handleCopyBuilding`):
```typescript
for (let i = 0; i < count; i++) {
  const newBuilding = await createBuilding({...}); // ❌ 에러 처리 없음

  const copiedFloors = sourceBuilding.floors.map(...);
  await updateBuildingFloorsAndTrades(...); // ❌ 실패 시 롤백 없음

  newBuildings.push(newBuilding);
}

await loadBuildings(); // ❌ 사용자 상호작용과 race 가능
```

**권장 수정**:
```typescript
try {
  const results = await Promise.allSettled(
    Array.from({ length: count }, async () => {
      const newBuilding = await createBuilding({...});
      await updateBuildingFloorsAndTrades(...);
      return newBuilding;
    })
  );

  const successful = results
    .filter((r): r is PromiseFulfilledResult<Building> => r.status === 'fulfilled')
    .map(r => r.value);

  if (successful.length < count) {
    toast.warning(`${count - successful.length}개 복사 실패`);
  }

  await loadBuildings();
} catch (error) {
  toast.error('복사 중 오류가 발생했습니다.');
}
```

---

#### 5.2.3 State 동기화 안티패턴

**심각도**: 🔴 Critical
**신뢰도**: 90%

**파일**: `src/components/buildings/BuildingBasicInfo.tsx:36-109, 258-325`

**현재 코드**:
```typescript
// 20+ useState가 props를 미러링
const [buildingName, setBuildingName] = useState(building?.buildingName || '');
const [totalUnits, setTotalUnits] = useState(building?.meta?.totalUnits || 0);
const [coreCount, setCoreCount] = useState(building?.meta?.coreCount || 0);
// ... 17개 더

// 거대한 동기화 useEffect (lines 258-325)
useEffect(() => {
  if (!building || !building.meta) return;
  setBuildingName(building.buildingName);
  setTotalUnits(building.meta.totalUnits);
  setCoreCount(building.meta.coreCount);
  // ... 모든 state 동기화
}, [building]);
```

**문제**:
- 이중 소스 오브 트루스
- 동기화 버그 위험
- 불필요한 리렌더링

**권장 수정**:
```typescript
// useReducer로 통합
const [formState, dispatch] = useReducer(buildingFormReducer, building?.meta);

// 또는 controlled components 패턴
// props를 직접 사용하고 onChange에서 부모에 알림
```

---

### 5.3 Important 이슈

#### 5.3.1 접근성(a11y) 부족

**심각도**: 🟠 Important
**신뢰도**: 85%

**통계**: 70+ 컴포넌트 파일에서 aria-* 속성 5개만 발견

**예시** (`BuildingBasicInfo.tsx:861`):
```typescript
<Input
  type="number"
  placeholder="시작 호수"
  value={pattern.from || ''}
  onChange={(e) => updateUnitTypePattern(index, 'from', Number(e.target.value))}
  disabled={isLocked}
  // ❌ aria-label, aria-describedby 없음
/>
```

**권장 수정**:
```typescript
<Input
  type="number"
  placeholder="시작 호수"
  value={pattern.from || ''}
  onChange={(e) => updateUnitTypePattern(index, 'from', Number(e.target.value))}
  disabled={isLocked}
  aria-label="단위세대 시작 호수"
  aria-describedby={`unit-pattern-${index}-hint`}
/>
```

---

#### 5.3.2 Error Boundary 미활용

**심각도**: 🟠 Important
**신뢰도**: 82%

**문제**: ErrorBoundary 컴포넌트가 존재하지만 복잡한 도메인 컴포넌트에 적용되지 않음

**영향받는 컴포넌트**:
- `FloorSettingsTable.tsx`
- `BuildingProcessPlanPage.tsx`
- `DetailedFloorTradeTable.tsx`

**권장**: 에러 발생 가능성 높은 컴포넌트 래핑

---

#### 5.3.3 Prop Drilling

**심각도**: 🟠 Important
**신뢰도**: 82%

**경로**: `BuildingBasicInfoPage` → `BuildingBasicInfo` → `FloorSettingsTable`

**현재 코드** (`BuildingBasicInfoPage.tsx:524-530`):
```typescript
<BuildingBasicInfo
  building={activeBuilding}
  onUpdate={loadBuildings}
  isFirstBuilding={activeBuildingIndex === 0}
  onStartGeneration={handleStartGeneration}      // ❌ prop drilling
  onGenerationProgress={handleGenerationProgress} // ❌ prop drilling
  onGenerationComplete={handleGenerationComplete} // ❌ prop drilling
  onBeforeRegenerate={...}
/>
```

**권장**: Context API 또는 커스텀 훅으로 추출

---

#### 5.3.4 리렌더링 최적화 부재

**심각도**: 🟠 Important
**신뢰도**: 80%

**파일**: `src/components/buildings/FloorSettingsTable.tsx:769-906`

**현재 코드**:
```typescript
{displayFloors.map((floor) => {
  return (
    <tr key={floor.id}>
      {/* 복잡한 셀 렌더링 - 메모이제이션 없음 */}
    </tr>
  );
})}
```

**문제**: 20-50개 행이 매번 전체 리렌더링

**권장**: React.memo로 행 컴포넌트 래핑 또는 virtualization 적용

---

### 5.4 useMemo 의존성 누락

**심각도**: 🟠 Important
**신뢰도**: 95%

**파일**: `src/components/buildings/BuildingBasicInfo.tsx:182-256`

**현재 코드**:
```typescript
const totalUnitCount = useMemo(() => {
  // corePilotisHeights를 사용하지만...
  const pilotisHeight = corePilotisHeights.length > pilotisIndex
    ? corePilotisHeights[pilotisIndex] ?? 0
    : 0;
  // ...
}, [unitTypePattern, coreCount, coreGroundFloors, groundCount, pilotisCount, corePilotisCounts, corePilotisHeights]);
// ⚠️ 의존성 배열 검증 필요
```

**권장**: `eslint-plugin-react-hooks`의 `exhaustive-deps` 규칙 활성화

---

### 5.5 컴포넌트 품질 요약

| 지표 | 값 |
|------|-----|
| useMemo/useCallback 사용 | 116회 (양호) |
| React.memo 사용 | 제한적 |
| aria-* 속성 | 5개 (심각히 부족) |
| Error Boundary 적용 | 미적용 |
| 평균 컴포넌트 크기 | 200-700줄 (일부 과대) |

---

## 6. 타입 시스템 분석

### 6.1 TypeScript 설정

**파일**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,           // ✅ 엄격 모드 활성화
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]      // ✅ 경로 별칭
    }
  }
}
```

### 6.2 타입 정의 현황

**파일**: `src/lib/types.ts` (740줄)

**강점**:
- ✅ 중앙화된 타입 정의
- ✅ 제네릭 타입 활용 (`ApiResponse<T>`, `PaginatedResponse<T>`)
- ✅ DTO 패턴 사용 (`CreateProjectDTO`, `UpdateProjectDTO`)
- ✅ Union 타입으로 유효값 제한 (`UserRole`, `ProjectStatus`, `FloorClass`)
- ✅ 인터페이스 상속 및 Pick/Partial 활용

**주요 타입**:

```typescript
// 역할 타입
export type UserRole = 'admin' | 'main_user' | 'vip_user' | 'user';

// API 응답 표준
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// 복잡한 도메인 타입 (Building)
export interface Building {
  id: string;
  projectId: string;
  buildingName: string;
  buildingNumber: number;
  meta: BuildingMeta;
  floors: Floor[];
  floorTrades: FloorTrade[];
}
```

### 6.3 타입 안전성 이슈

#### 6.3.1 `any` 타입 사용

**발견 위치**: 25개 (10개 파일)

| 파일 | 횟수 |
|------|------|
| `DetailedFloorTradeTable.tsx` | 6 |
| `FloorTradeTable.tsx` | 6 |
| `quantity-reference.ts` | 3 |
| `buildings.ts` | 2 |
| 기타 | 8 |

#### 6.3.2 타입 억제 사용

**발견 위치**: 15개 (11개 파일)

```
@ts-ignore, @ts-expect-error, eslint-disable 사용
```

| 파일 | 횟수 |
|------|------|
| `BuildingBasicInfo.tsx` | 2 |
| `FloorTradeTable.tsx` | 2 |
| `useAsyncData.ts` | 2 |
| 기타 | 9 |

### 6.4 타입 시스템 권장사항

1. **any 타입 제거**: unknown + 타입 가드 사용
2. **Zod 스키마 일관 적용**: 런타임 타입 검증
3. **API 응답 타입 강화**: 서버 응답에 대한 타입 정의
4. **제네릭 활용 확대**: 재사용 가능한 타입 패턴

---

## 7. 테스트 커버리지

### 7.1 현재 상태

| 항목 | 값 |
|------|-----|
| 테스트 파일 수 | 2개 |
| 테스트 위치 | `src/__tests__/` |
| 커버리지 목표 | 50% (jest.config.ts) |
| 실제 커버리지 | 추정 5% 미만 |

### 7.2 기존 테스트

```
src/__tests__/
├── components/
│   └── Button.test.tsx    # UI 컴포넌트 테스트
└── utils/
    └── cache.test.ts      # 캐시 유틸리티 테스트
```

### 7.3 테스트 부재 영역

| 영역 | 우선순위 | 이유 |
|------|----------|------|
| **서비스 레이어** | 🔴 Critical | 핵심 비즈니스 로직 |
| **API 라우트** | 🔴 Critical | 보안 및 데이터 무결성 |
| **권한 시스템** | 🔴 Critical | 접근 제어 검증 |
| **Buildings 도메인** | 🟠 Important | 복잡한 계산 로직 |
| **폼 유효성 검사** | 🟡 Medium | 사용자 입력 처리 |
| **UI 컴포넌트** | 🟢 Low | 비교적 단순 |

### 7.4 테스트 전략 권장

```
테스트 피라미드:

        /\
       /  \      E2E (10%)
      /────\     - 핵심 사용자 플로우
     /      \
    /────────\   Integration (30%)
   /          \  - API 라우트
  /            \ - 서비스 + DB
 /──────────────\
/                \ Unit (60%)
                   - 서비스 함수
                   - 유틸리티
                   - 훅
```

---

## 8. 성능 분석

### 8.1 잠재적 성능 이슈

#### 8.1.1 캐시 메모리 관리

**파일**: `src/lib/services/cache.ts`

**문제**: 자동 정리 메커니즘 없음

```typescript
// cleanup() 메서드는 존재하지만 자동 호출되지 않음
class Cache<T> {
  cleanup() { /* 만료된 항목 제거 */ }
}
```

**권장**: 주기적 정리 또는 LRU 캐시 구현

---

#### 8.1.2 대형 컴포넌트 리렌더링

**파일**: `src/components/buildings/FloorSettingsTable.tsx`

**문제**:
- 20-50개 행이 매번 전체 리렌더링
- Row 컴포넌트에 React.memo 미적용
- Virtualization 미사용

**권장**:
```typescript
const FloorRow = React.memo(({ floor, onUpdate }) => {
  return <tr>...</tr>;
});
```

---

#### 8.1.3 불필요한 API 호출

**파일**: 여러 컴포넌트

**문제**: 동일 데이터 중복 fetch

**권장**:
- React Query 또는 SWR 도입
- 또는 기존 캐시 레이어 일관 활용

---

### 8.2 번들 크기 고려사항

**package.json 분석**:

| 패키지 | 크기 (추정) | 용도 |
|--------|-------------|------|
| `recharts` | ~500KB | 차트 |
| `framer-motion` | ~150KB | 애니메이션 |
| `@radix-ui/*` | ~100KB | UI 컴포넌트 |
| `react-markdown` | ~50KB | 마크다운 렌더링 |

**권장**:
- Dynamic import로 코드 분할
- 차트 컴포넌트 lazy loading

---

### 8.3 성능 모니터링 권장

1. **Core Web Vitals 측정**: LCP, FID, CLS
2. **번들 분석**: `@next/bundle-analyzer`
3. **API 응답 시간 모니터링**
4. **메모리 사용량 추적**

---

## 9. 코드 품질 메트릭

### 9.1 코드 통계

| 지표 | 값 |
|------|-----|
| TypeScript 파일 | 100+ |
| 총 라인 수 | 20,000+ (추정) |
| `any` 타입 사용 | 25개 |
| `console.log/error` | 56개 |
| `@ts-ignore` | 15개 |
| 테스트 파일 | 2개 |

### 9.2 영역별 점수

| 영역 | 점수 | 설명 |
|------|------|------|
| **아키텍처** | 7/10 | 구조 양호, 일부 모듈 비대 |
| **보안** | 3/10 | API 인증 심각한 누락 |
| **타입 안전성** | 7/10 | strict 모드, any 일부 |
| **테스트** | 2/10 | 거의 부재 |
| **성능** | 5/10 | 최적화 여지 많음 |
| **접근성** | 2/10 | ARIA 거의 없음 |
| **코드 일관성** | 5/10 | 패턴 불일치 |
| **문서화** | 4/10 | 주석 부족 |

### 9.3 종합 점수

```
┌─────────────────────────────────────────┐
│                                         │
│          종합 점수: 4.4 / 10            │
│                                         │
│  ████████░░░░░░░░░░░░  44%              │
│                                         │
│  상태: 개선 필요                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 10. 개선 권장사항

### 10.1 P0: 즉시 수정 (배포 전 필수)

| # | 항목 | 영향받는 파일 | 예상 소요 |
|---|------|--------------|----------|
| 1 | Gemini API 인증 추가 | `src/app/api/gemini/*` (8개) | 2-4시간 |
| 2 | CSRF 토큰 구현 | 모든 POST/DELETE 라우트 | 4-8시간 |
| 3 | Rate Limiting 추가 | API 미들웨어 | 2-4시간 |
| 4 | Auth callback 에러 처리 | `src/app/auth/callback/route.ts` | 1시간 |

### 10.2 P1: 1-2주 내

| # | 항목 | 영향받는 파일 | 예상 소요 |
|---|------|--------------|----------|
| 1 | 에러 처리 패턴 통일 | `lib/services/*` | 1-2일 |
| 2 | `.substr()` → `.slice()` | `buildings.ts`, `unitRates.ts` | 2시간 |
| 3 | JSON.parse try-catch | `gemini.ts` | 1시간 |
| 4 | 캐시 race condition 수정 | `buildings.ts` | 2시간 |
| 5 | 입력 유효성 검사 강화 | Gemini API 라우트 | 4시간 |

### 10.3 P2: 1개월 내

| # | 항목 | 설명 |
|---|------|------|
| 1 | BuildingBasicInfo 리팩토링 | State 관리 개선 |
| 2 | 접근성(a11y) 개선 | ARIA 속성 추가 |
| 3 | 테스트 커버리지 확대 | 서비스, API 테스트 |
| 4 | Error Boundary 적용 | 복잡한 컴포넌트 |
| 5 | React.memo 최적화 | FloorSettingsTable 등 |

### 10.4 P3: 지속적 개선

| # | 항목 | 현재 | 목표 |
|---|------|------|------|
| 1 | `console.log` 정리 | 56개 | 0개 (로거 사용) |
| 2 | `any` 타입 제거 | 25개 | 0개 |
| 3 | 테스트 커버리지 | ~5% | 50%+ |
| 4 | 문서화 | 부족 | JSDoc + README |

---

## 부록 A: 파일별 이슈 인덱스

| 파일 | 이슈 | 섹션 |
|------|------|------|
| `src/app/api/gemini/*` | 인증 누락 | 3.1.1 |
| `src/app/auth/callback/route.ts` | 에러 처리 없음 | 3.2.2 |
| `src/lib/services/buildings.ts` | deprecated 메서드, 캐시 버그 | 4.2.1, 4.2.3 |
| `src/lib/services/gemini.ts` | 안전하지 않은 JSON.parse | 4.2.2 |
| `src/lib/services/projects.ts` | 캐시 무효화 과도 | 4.3.3 |
| `src/components/buildings/BuildingBasicInfo.tsx` | 메모리 누수, state 안티패턴 | 5.2.1, 5.2.3 |
| `src/components/buildings/BuildingBasicInfoPage.tsx` | race condition | 5.2.2 |
| `src/components/buildings/FloorSettingsTable.tsx` | 리렌더링 최적화 | 5.3.4 |
| `src/lib/supabase/middleware.ts` | 민감 정보 로깅 | 3.2.5 |

---

## 부록 B: 참고 자료

- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/authentication)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

---

**리뷰 완료일**: 2026-01-20
**다음 리뷰 권장일**: 보안 이슈 수정 후 2주 내
