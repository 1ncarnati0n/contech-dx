# 구현 가이드 및 체크리스트

> **작성일**: 2026-02-10
> **대상**: contech-dx 리팩토링 실무자

---

## 1. 개발 환경 설정

### 1.1 필수 도구

```bash
# Node.js 버전 (권장)
node --version  # v20.x 이상

# 패키지 매니저 (주의: pnpm 아닌 npm 사용)
npm --version   # 10.x 이상

# 에디터 확장
# - ESLint
# - Prettier
# - TypeScript
```

### 1.2 프로젝트 설정

```bash
# 클론 및 의존성 설치
git clone <repository-url>
cd contech-dx
npm install

# 환경 변수 설정
cp apps/web/.env.example apps/web/.env.local
# .env.local 편집하여 Supabase 키 설정
```

---

## 2. 브랜치 전략

### 2.1 브랜치 명명 규칙

```
feature/     # 새 기능
  feature/TD-1-localstorage-migration

refactor/    # 리팩토링
  refactor/TD-4-component-split

fix/         # 버그 수정
  fix/TD-2-auth-cache

chore/       # 설정/문서
  chore/update-readme
```

### 2.2 브랜치 흐름

```
main (프로덕션)
  │
  ├── dev (개발)
  │     │
  │     ├── feature/TD-1-xxx
  │     ├── refactor/TD-4-yyy
  │     └── fix/TD-2-zzz
  │
  └── hotfix/critical-bug (긴급)
```

---

## 3. 커밋 컨벤션

### 3.1 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 3.2 Type

| Type | 설명 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 (기능 변경 없음) |
| `docs` | 문서 변경 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드/설정 변경 |

### 3.3 예시

```
refactor(buildings): BasementProcessPlanPage 훅 분리

- useBasementProcessPlan 훅 추출
- 계산 로직 utils로 이동
- 컴포넌트 LOC 2155 → 250 감소

Refs: TD-4
```

---

## 4. PR 템플릿

```markdown
## 변경 사항

<!-- 무엇을 변경했는지 간략히 설명 -->

## 변경 유형

- [ ] 버그 수정
- [ ] 새 기능
- [ ] 리팩토링
- [ ] 문서 업데이트

## 관련 이슈

<!-- 관련 기술 부채 ID 또는 이슈 번호 -->
Refs: TD-XX

## 테스트

- [ ] 로컬에서 테스트 완료
- [ ] 기존 기능 회귀 없음 확인
- [ ] 관련 테스트 추가/수정

## 체크리스트

- [ ] ESLint 통과 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 코드 리뷰 요청

## 스크린샷 (UI 변경 시)

<!-- 변경 전/후 스크린샷 -->
```

---

## 5. 컴포넌트 분할 가이드

### 5.1 Pattern A: 훅 추출

**언제 사용**: 상태 관리와 비즈니스 로직이 복잡할 때

```typescript
// Before: 모든 로직이 컴포넌트에
function LargeComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => { /* ... */ };
  const processData = (item) => { /* ... */ };
  const handleSubmit = async () => { /* ... */ };

  return (/* 큰 JSX */);
}

// After: 훅으로 분리
function useLargeComponentLogic() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => { /* ... */ };
  const processData = (item) => { /* ... */ };
  const handleSubmit = async () => { /* ... */ };

  return { data, loading, fetchData, processData, handleSubmit };
}

function LargeComponent() {
  const { data, loading, handleSubmit } = useLargeComponentLogic();

  return (/* 깔끔한 JSX */);
}
```

### 5.2 Pattern B: 컴포넌트 분해

**언제 사용**: JSX가 길고 반복적일 때

```typescript
// Before: 하나의 큰 컴포넌트
function LargeTable() {
  return (
    <table>
      <thead>
        {/* 50줄의 헤더 */}
      </thead>
      <tbody>
        {items.map(item => (
          <tr>
            {/* 30줄의 행 */}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// After: 분리된 컴포넌트
function LargeTable() {
  return (
    <table>
      <TableHeader columns={columns} />
      <TableBody items={items} />
    </table>
  );
}

function TableHeader({ columns }) {
  return <thead>{/* ... */}</thead>;
}

function TableBody({ items }) {
  return (
    <tbody>
      {items.map(item => <TableRow key={item.id} item={item} />)}
    </tbody>
  );
}

function TableRow({ item }) {
  return <tr>{/* ... */}</tr>;
}
```

### 5.3 분할 체크리스트

- [ ] 컴포넌트 LOC가 500 이하인가?
- [ ] 단일 책임 원칙을 따르는가?
- [ ] Props가 10개 이하인가?
- [ ] 중첩 깊이가 3레벨 이하인가?
- [ ] 재사용 가능한 부분을 분리했는가?

---

## 6. 테스트 가이드

### 6.0 기존 테스트 현황

현재 프로젝트에 **11개 테스트 파일**이 존재하며, 핵심 비즈니스 로직 위주로 테스트가 작성되어 있습니다.

```
apps/web/src/__tests__/
├── components/
│   └── Button.test.tsx                    # UI 컴포넌트 테스트
└── utils/
    ├── cache.test.ts                      # MemoryCache TTL 캐시 테스트
    ├── calculateFormula.test.ts           # 수식 계산 테스트
    ├── floorIdUtils.test.ts               # 층 ID 유틸 테스트
    ├── process-calculation.test.ts        # 공정 계산 테스트
    ├── process-days-calculator.test.ts    # 공정일 계산기 테스트
    ├── process-quantity-resolver.test.ts  # 물량 해석 테스트
    ├── process-to-gantt-converter.test.ts # 간트 변환기 테스트
    ├── quantity-reference-migration.test.ts # 레거시 마이그레이션 테스트
    ├── quantity-reference.test.ts         # 물량 참조 테스트
    └── tradeDataHelpers.test.ts           # 공종 데이터 헬퍼 테스트
```

**분석**: 공정 계산, 물량 해석, 간트 변환 등 핵심 비즈니스 로직에 대한 테스트가 잘 갖춰져 있으며, MemoryCache 캐시 테스트도 포함됨. 컴포넌트 테스트는 Button 1건만 존재.

### 6.1 단위 테스트 (프로젝트 실제 패턴 기반)

```typescript
// 기존 패턴 참고: __tests__/utils/process-calculation.test.ts
import {
  calculateTotalWorkers,
  calculateWorkDaysWithRounding,
} from '@/lib/utils/process-calculation';

describe('calculateTotalWorkers', () => {
  it('should calculate workers correctly', () => {
    const result = calculateTotalWorkers({
      quantity: 100,
      productivity: 10,
    });
    expect(result).toBe(10);
  });

  it('should return 0 for zero productivity', () => {
    const result = calculateTotalWorkers({
      quantity: 100,
      productivity: 0,
    });
    expect(result).toBe(0);
  });
});

// 기존 패턴 참고: __tests__/utils/cache.test.ts
import { MemoryCache, DEFAULT_TTL, SHORT_TTL } from '@/lib/services/cache';

describe('MemoryCache', () => {
  it('should return cached data within TTL', () => {
    const cache = new MemoryCache<string>({ ttl: DEFAULT_TTL });
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('should return null for expired entries', () => {
    const cache = new MemoryCache<string>({ ttl: 0 }); // 즉시 만료
    cache.set('key', 'value');
    expect(cache.get('key')).toBeNull();
  });
});
```

### 6.2 훅 테스트

```typescript
// __tests__/unit/hooks/useAsyncData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useAsyncData } from '@/lib/hooks/useAsyncData';

describe('useAsyncData', () => {
  it('should fetch data successfully', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(() => useAsyncData(mockFetch));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({ data: 'test' });
    });
  });
});
```

### 6.3 API 통합 테스트

```typescript
// __tests__/integration/api/projects.test.ts
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/projects/route';

describe('POST /api/projects', () => {
  it('should create project with valid data', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: { name: 'Test Project' },
    });

    const response = await POST(req as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should return 400 for invalid data', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: { name: '' }, // 빈 이름
    });

    const response = await POST(req as any);

    expect(response.status).toBe(400);
  });
});
```

### 6.4 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 파일 테스트
npm test -- process-calculation.test.ts

# 커버리지 리포트
npm test -- --coverage
```

---

## 7. 마이그레이션 체크리스트

### 7.1 localStorage → Supabase 이관

#### 사전 준비
- [ ] `process_plans` 테이블 생성 완료
- [ ] RLS 정책 설정 완료
- [ ] 타입 정의 업데이트 완료

#### 마이그레이션 스크립트

```typescript
// scripts/migrate-process-plans.ts
import { createClient } from '@supabase/supabase-js';

async function migrateProcessPlans() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. 모든 건물 조회
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id');

  for (const building of buildings ?? []) {
    // 2. localStorage 키 시뮬레이션 (실제로는 클라이언트에서 실행)
    const storageKey = `contech_process_plan_${building.id}`;

    // 3. 데이터 읽기 (클라이언트 스크립트에서)
    // const data = localStorage.getItem(storageKey);

    // 4. Supabase에 저장
    // await supabase.from('process_plans').upsert({
    //   building_id: building.id,
    //   data: JSON.parse(data),
    // });
  }

  console.log('Migration completed');
}
```

#### 실행 순서
1. [ ] 스키마 마이그레이션 적용
2. [ ] 백업 스크립트 실행 (localStorage 데이터 추출)
3. [ ] 마이그레이션 스크립트 실행
4. [ ] 데이터 검증
5. [ ] 컴포넌트 코드 전환
6. [ ] 7일 후 localStorage 정리

---

## 8. 완료 기준

### 8.1 Phase 1 완료 기준

| 항목 | 기준 | 검증 방법 |
|------|------|----------|
| 인증 버그 | 에러 로깅 추가 | 코드 리뷰 |
| API 검증 | 모든 POST/PUT에 적용 | grep 검색 |
| Gemini 안정화 | 대용량 입력 처리 | 수동 테스트 |

### 8.2 Phase 2 완료 기준

| 항목 | 기준 | 검증 방법 |
|------|------|----------|
| 컴포넌트 크기 | 모든 컴포넌트 < 500 LOC | wc -l |
| Props Drilling | Context 도입 완료 | 코드 리뷰 |
| 캐시 설정 | QueryClient 설정 표준화 | 코드 리뷰 |

### 8.3 Phase 3 완료 기준

| 항목 | 기준 | 검증 방법 |
|------|------|----------|
| 테스트 커버리지 | > 50% | npm test --coverage |
| 데이터 이관 | localStorage 사용 0 | grep 검색 |
| 문서화 | 주요 컴포넌트 TSDoc | 코드 리뷰 |

---

## 9. 자주 발생하는 문제

### 9.1 모노레포 빌드 순서

```bash
# ⚠️ 라이브러리 수정 시 반드시 순서대로 빌드
# 1. 라이브러리 먼저
cd packages/sa-gantt-lib && npm run build

# 2. 그 다음 web
cd apps/web && npm run build
```

### 9.2 ESLint 오류

```bash
# 전체 검사
cd apps/web && npx eslint src

# 자동 수정
cd apps/web && npx eslint src --fix
```

### 9.3 타입 오류

```bash
# 타입 검사
cd apps/web && npx tsc --noEmit

# 타입 생성 (Supabase)
npx supabase gen types typescript > src/lib/types/database.ts
```

---

## 10. 참고 자료

### 10.1 내부 문서

- [00-overview.md](./00-overview.md) - 전체 개요
- [01-apps-web-analysis.md](./01-apps-web-analysis.md) - apps/web 분석
- [02-sa-gantt-lib-analysis.md](./02-sa-gantt-lib-analysis.md) - sa-gantt-lib 분석
- [03-architecture-issues.md](./03-architecture-issues.md) - 아키텍처 이슈
- [04-refactoring-roadmap.md](./04-refactoring-roadmap.md) - 리팩토링 로드맵

### 10.2 외부 문서

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [@tanstack/react-virtual Docs](https://tanstack.com/virtual/latest)
- [date-fns Docs](https://date-fns.org/docs)
- [06-process-to-gantt-converter-analysis.md](./06-process-to-gantt-converter-analysis.md) - 컨버터 분석

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었으며, 2026-02-10 정확성 교정이 완료되었습니다.*
