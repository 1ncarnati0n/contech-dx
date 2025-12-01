# 코드 리뷰 및 리팩토링 계획

> 작성일: 2025-11-29
> 목적: 코드 가독성, 유지관리, 성능 개선 및 향후 기능 확장 대비

---

## 📊 현재 상태 분석 요약

### ✅ 잘 구축된 부분

| 영역 | 내용 |
|------|------|
| **프로젝트 구조** | Route Groups `(container)`, 서비스 레이어 분리, 모듈화된 UI 컴포넌트 |
| **타입 시스템** | 중앙화된 타입 정의 (`types.ts`), DTO 패턴 사용 |
| **디자인 시스템** | CSS 변수 기반 테마, CVA를 활용한 Button variants |
| **권한 관리** | Server/Client 분리된 권한 유틸리티 |
| **상수 관리** | 에러 메시지, 라우트, 역할 등 상수화 |

---

## 🚨 개선이 필요한 영역

### 1. 코드 중복 (DRY 원칙 위반)

**문제:** `STATUS_COLORS`, `STATUS_LABELS`, `formatCurrency`, `formatDate`가 여러 파일에 중복 정의됨

**영향받는 파일:**
- `src/components/projects/ProjectCard.tsx`
- `src/components/projects/ProjectDetailClient.tsx`

---

### 2. 성능 이슈

**문제 1:** 렌더링마다 랜덤값 재생성
- 위치: `ProjectCard.tsx` (line 32-34)
- `mockProgress`, `mockTeamCount`가 매 렌더링마다 새로운 값 생성

**문제 2:** 필터링 로직이 useEffect 내에 있음
- 위치: `ProjectList.tsx` (line 29-65)
- `useMemo` 사용 권장

---

### 3. 개발용 코드 잔존

**문제:** 프로덕션에 불필요한 console.log 다수
- `ProjectList.tsx` (line 33-36)
- `createProject` 함수 등

---

### 4. 미사용 상수

**문제:** `constants.ts`에 정의된 상수들이 실제 코드에서 사용되지 않음
- `API_ENDPOINTS`
- `ERROR_MESSAGES`
- `SUCCESS_MESSAGES`

---

### 5. 훅 복잡도

**문제:** `useFileSearch` 훅이 472줄로 너무 복잡함
- 위치: `src/components/file-search/useFileSearch.ts`
- 분리 필요

---

## 📋 리팩토링 실행 계획

### Phase 1: 유틸리티 통합 (P0 - 즉시 적용)

#### 1.1 폴더 구조 생성
```
📁 src/lib/utils/
├── index.ts           # 통합 export
├── formatters.ts      # 날짜, 통화 포맷팅
├── project-status.ts  # 상태 색상, 라벨
└── logger.ts          # 환경별 로깅
```

#### 1.2 `formatters.ts` 생성
```typescript
export function formatCurrency(amount?: number, options?: {
  notation?: 'compact' | 'standard';
}): string {
  if (!amount) return '-';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    notation: options?.notation ?? 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDate(dateStr: string, style: 'short' | 'long' = 'short'): string {
  const options: Intl.DateTimeFormatOptions = style === 'long' 
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('ko-KR', options);
}
```

#### 1.3 `project-status.ts` 생성
```typescript
import type { ProjectStatus } from '@/lib/types';

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, {
  label: string;
  colors: string;
}> = {
  planning: {
    label: '기획',
    colors: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  active: {
    label: '진행중',
    colors: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  },
  completed: {
    label: '완료',
    colors: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  },
  on_hold: {
    label: '보류',
    colors: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  },
  cancelled: {
    label: '취소',
    colors: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
  dummy: {
    label: '🧪 테스트',
    colors: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-dashed border-purple-400',
  },
} as const;

export function getStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_CONFIG[status]?.label ?? '알 수 없음';
}

export function getStatusColors(status: ProjectStatus): string {
  return PROJECT_STATUS_CONFIG[status]?.colors ?? '';
}
```

#### 1.4 `logger.ts` 생성
```typescript
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => isDev && console.log('[DEBUG]', ...args),
  info: (...args: unknown[]) => isDev && console.info('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};
```

---

### Phase 2: 성능 최적화 (P1)

#### 2.1 ProjectCard Mock 데이터 결정론적 생성
```typescript
// 프로젝트 ID 기반 결정론적 값 생성
const stableValues = useMemo(() => {
  const hash = project.id.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const absHash = Math.abs(hash);
  return {
    progress: absHash % 100,
    teamCount: (absHash % 10) + 2,
  };
}, [project.id]);
```

#### 2.2 ProjectList 필터링 useMemo 적용
```typescript
const filteredProjects = useMemo(() => {
  let filtered = [...projects];
  
  if (!isAdmin) {
    filtered = filtered.filter((p) => p.status !== 'dummy');
  }
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.location?.toLowerCase().includes(query) ||
      p.client?.toLowerCase().includes(query)
    );
  }
  
  if (statusFilter !== 'all') {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }
  
  return filtered;
}, [projects, searchQuery, statusFilter, isAdmin]);
```

---

### Phase 3: useFileSearch 훅 분리 (P2)

```
📁 src/hooks/file-search/
├── index.ts                  # 통합 훅
├── useFileSearchStores.ts    # 스토어 CRUD
├── useFileSearchFiles.ts     # 파일 업로드/관리
├── useFileSearchChat.ts      # 채팅 기능
├── useFileSearchSessions.ts  # 세션 관리
└── types.ts                  # 훅 전용 타입
```

---

### Phase 4: 상수 활용도 높이기 (P2)

- `API_ENDPOINTS` → Gemini 서비스에서 사용
- `ERROR_MESSAGES` → API 라우트에서 사용
- `SUCCESS_MESSAGES` → 토스트 메시지에서 사용

---

### Phase 5: Feature 기반 구조 (P3 - 향후)

간트차트, 협업 도구 추가 시 적용:
```
📁 src/features/
├── projects/
├── gantt/
└── collaboration/
```

---

## 🎯 실행 체크리스트

### Phase 1 (즉시 실행)
- [ ] `src/lib/utils/` 폴더 생성
- [ ] `formatters.ts` 생성
- [ ] `project-status.ts` 생성
- [ ] `logger.ts` 생성
- [ ] `index.ts` (통합 export) 생성
- [ ] `ProjectCard.tsx` 수정 - 중복 코드 제거
- [ ] `ProjectDetailClient.tsx` 수정 - 중복 코드 제거
- [ ] console.log → logger 교체

### Phase 2 (성능 최적화)
- [ ] `ProjectCard.tsx` - Mock 데이터 useMemo 적용
- [ ] `ProjectList.tsx` - 필터링 useMemo 적용
- [ ] useEffect 의존성 정리

### Phase 3 (훅 분리)
- [ ] `src/hooks/file-search/` 폴더 생성
- [ ] 스토어 관련 로직 분리
- [ ] 파일 관련 로직 분리
- [ ] 채팅 관련 로직 분리
- [ ] 세션 관련 로직 분리

---

## 📝 참고 사항

- 각 Phase 완료 후 테스트 실행 권장
- 기능 변경 없이 리팩토링만 진행
- 커밋은 Phase 단위로 분리하여 롤백 용이하게 유지

