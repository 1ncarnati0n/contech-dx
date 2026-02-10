# 코드 리뷰 분석 보고서: 전체 개요

> **분석일**: 2026-02-10
> **분석 대상**: contech-dx 모노레포
> **목적**: 리팩토링 가이드를 위한 상세 분석

---

## 1. 프로젝트 개요

### 1.1 기술 스택

| 영역 | 기술 |
|------|------|
| **모노레포** | npm workspaces + Turborepo 2.3.3 |
| **웹 앱** | Next.js 16 + React 19 + TypeScript |
| **백엔드/DB** | Supabase (PostgreSQL, Auth, Storage) |
| **상태 관리** | Zustand ^5.0.8 |
| **서버 캐시** | Custom TTL MemoryCache (자체 구현) |
| **간트 라이브러리** | Vite 기반 커스텀 빌드 (sa-gantt-lib) |
| **가상화** | @tanstack/react-virtual ^3.13.12 |
| **AI 통합** | Google Gemini API |
| **스타일링** | Tailwind CSS ^4.0.0 + shadcn/ui |

### 1.2 코드 규모

| 패키지 | 파일 수 | 라인 수 (추정) |
|--------|---------|----------------|
| `apps/web` | ~288 TS/TSX | ~30,500 LOC |
| `packages/sa-gantt-lib` | ~144 TS/TSX | ~26,298 LOC |
| **총합** | ~432 파일 | ~56,798 LOC |

> 전체 모노레포 규모: 약 87,000 LOC (설정, 테스트, 문서 포함)

### 1.3 ESLint 상태

```
apps/web: errors: 0, warnings: 0 ✅
```

최근 리팩토링으로 모든 ESLint 이슈가 해결되었습니다.

---

## 2. 핵심 이슈 요약

### 🔴 Critical (즉시 수정 필요)

| ID | 이슈 | 위치 | 영향 |
|----|------|------|------|
| C-1 | Supabase 인증 캐시 버그 | `server.ts` | 인증 토큰 갱신 실패 가능성 |
| C-2 | Gemini API 오버플로우 | `gemini/route.ts` | 대용량 입력 시 API 실패 |
| C-3 | 고복잡도 컴포넌트 (2,000+ LOC) | `BuildingProcessPlanPage.tsx` 등 | 유지보수 어려움 |

### 🟠 High (단기 수정 권장)

| ID | 이슈 | 위치 | 영향 |
|----|------|------|------|
| H-1 | Props Drilling (부분 해소 중) | `sa-gantt-lib` | GanttContext(168 LOC) 도입됨, 확장 필요 |
| H-2 | 캐시 일관성 부재 | `web/services` | MemoryCache↔Supabase Realtime 미연동 |
| H-3 | API 파라미터 검증 불완전 | `api/` 라우트들 | 타입 안전성 누락 |

### 🟡 Medium (중기 개선 대상)

| ID | 이슈 | 영향 |
|----|------|------|
| M-1 | 테스트 커버리지 확대 필요 | 11개 테스트 파일 존재, 컴포넌트/API 테스트 부족 |
| M-2 | localStorage ↔ Supabase 분산 | 데이터 저장소 일관성 |
| M-3 | 문서화 부족 | 온보딩/인수인계 어려움 |

---

## 3. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        contech-dx                           │
├─────────────────────────────────────────────────────────────┤
│  apps/web (Next.js 16)                                      │
│  ├── app/                 # App Router 페이지               │
│  │   ├── (container)/     # 인증 컨테이너 (사이드바)        │
│  │   └── (fullscreen)/    # 전체화면 (간트 등)              │
│  ├── components/          # UI 컴포넌트                     │
│  │   ├── buildings/       # 빌딩 관련 (고복잡도 영역)       │
│  │   ├── projects/        # 프로젝트 관리                   │
│  │   └── ui/              # 공통 UI (shadcn)                │
│  ├── lib/                                                   │
│  │   ├── supabase/        # Supabase 클라이언트             │
│  │   ├── services/        # 데이터 서비스 + MemoryCache     │
│  │   ├── hooks/           # 커스텀 훅                       │
│  │   └── utils/           # 유틸리티 (1,102 LOC 컨버터 등)  │
│  └── __tests__/           # 테스트 (11개 파일)              │
├─────────────────────────────────────────────────────────────┤
│  packages/sa-gantt-lib (Vite)                               │
│  ├── components/          # 간트 차트 컴포넌트              │
│  │   └── GanttChart/      # 메인 컴포넌트 (634 LOC)        │
│  │       └── hooks/       # 컴포넌트 전용 훅               │
│  ├── context/             # GanttContext (168 LOC) ✅       │
│  ├── store/               # Zustand 상태 관리               │
│  ├── hooks/               # 가상화 등 (143 LOC)            │
│  └── utils/date/          # 달력 시스템 (995 LOC)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
│  ├── PostgreSQL           # 메인 데이터베이스               │
│  ├── Auth                 # 인증/인가                       │
│  ├── Storage              # 파일 스토리지                   │
│  └── RLS                  # Row Level Security              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 권장 개선 순서

### Phase 1: 긴급 수정 (1주)
- [ ] Supabase 인증 캐시 버그 수정
- [ ] API 파라미터 검증 미들웨어 적용
- [ ] Gemini API 토큰 제한 처리

### Phase 2: 단기 개선 (2-4주)
- [ ] 대형 컴포넌트 분할 (2,000+ LOC → 500 LOC 이하)
- [ ] GanttContext 범위 확장 (기존 Context를 기반으로)
- [ ] MemoryCache + Supabase Realtime 캐시 연동 개선

### Phase 3: 중기 개선 (1-2개월)
- [ ] 기존 11개 테스트 기반으로 커버리지 확대 (목표: 50%)
- [ ] localStorage → Supabase 이관
- [ ] 컴포넌트 문서화 (Storybook 도입 검토)

---

## 5. 문서 목차

| 문서 | 내용 |
|------|------|
| [01-apps-web-analysis.md](./01-apps-web-analysis.md) | apps/web 상세 분석 |
| [02-sa-gantt-lib-analysis.md](./02-sa-gantt-lib-analysis.md) | sa-gantt-lib 상세 분석 |
| [03-architecture-issues.md](./03-architecture-issues.md) | 아키텍처 이슈 및 개선안 |
| [04-refactoring-roadmap.md](./04-refactoring-roadmap.md) | 우선순위 기반 리팩토링 로드맵 |
| [05-implementation-guide.md](./05-implementation-guide.md) | 구현 가이드 및 체크리스트 |
| [06-process-to-gantt-converter-analysis.md](./06-process-to-gantt-converter-analysis.md) | 공정→간트 컨버터 상세 분석 |

---

## 6. 참고 문서

- [`docs/refactoring_status.md`](../refactoring_status.md) - 기존 리팩토링 이력
- [`README.md`](../../README.md) - 프로젝트 개요
- [`Architecture.md`](../../Architecture.md) - 아키텍처 문서 (존재 시)

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었으며, 2026-02-10 정확성 교정이 완료되었습니다.*
