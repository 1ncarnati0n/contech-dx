# Architecture — ConTech-DX

> 건축직영공사 공정관리 시스템 (Construction Technology Digital Transformation)
>
> 이 문서는 시스템의 **구조와 설계 결정**을 설명합니다. 빠른 시작은 [README.md](./README.md)를 참조하세요.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [모노레포 구조](#2-모노레포-구조)
3. [기술 스택](#3-기술-스택)
4. [apps/web 아키텍처](#4-appsweb-아키텍처)
5. [packages/sa-gantt-lib 아키텍처](#5-packagessa-gantt-lib-아키텍처)
6. [연결 구조 (Web ↔ Library)](#6-연결-구조-web--library)
7. [빌드 & 배포 파이프라인](#7-빌드--배포-파이프라인)
8. [주요 아키텍처 패턴](#8-주요-아키텍처-패턴)
9. [물량 해석 시스템 (Quantity Resolution)](#9-물량-해석-시스템-quantity-resolution)
10. [대형 파일 목록 (리팩토링 후보)](#10-대형-파일-목록-리팩토링-후보)
11. [리팩토링/품질 현황](#11-리팩토링품질-현황)

---

## 1. 프로젝트 개요

ConTech-DX는 건설 현장의 공정관리를 디지털화하는 풀스택 웹 애플리케이션입니다.

**핵심 기능:**

| 기능 | 설명 |
|------|------|
| **간트 차트** | 건설 특화 공정표 (공구공정표/주공정표), 10,000+ 태스크 가상화 |
| **BIM/IFC 뷰어** | Three.js 기반 3D 건물 모델 뷰어 |
| **2D 캐스트 플랜** | Konva 캔버스 기반 콘크리트 타설 계획도 |
| **AI 챗봇** | Google Gemini 기반 페이지 컨텍스트 인식 어시스턴트 |
| **공정 모듈** | 물량·단가·공기 자동산출 |
| **대시보드** | 공사 진척률, KPI 지표 시각화 |

---

## 2. 모노레포 구조

```
contech-dx/
├── apps/
│   └── web/                      # Next.js 16 웹 애플리케이션 (@contech/web)
│       ├── public/               #   정적 자산 (IFC 모델, WASM)
│       ├── scripts/              #   Python 분석 스크립트
│       ├── sql/                  #   DB 스키마, 마이그레이션, 시드
│       │   ├── schema/
│       │   ├── migrations/
│       │   └── seeds/
│       └── src/
│           ├── app/              #     App Router (페이지, API 라우트)
│           ├── components/       #     React 컴포넌트 (~126 TSX)
│           ├── lib/              #     서비스, 훅, 유틸, 스토어 (~80 TS)
│           ├── styles/           #     글로벌 스타일
│           └── types/            #     타입 정의
│
├── packages/
│   └── sa-gantt-lib/             # 간트차트 라이브러리 (sa-gantt-lib 0.1.1)
│       ├── dist/                 #   빌드 출력 (ESM + CJS + CSS + .d.ts)
│       └── src/lib/
│           ├── components/       #     React 컴포넌트 (~45 TSX)
│           ├── context/          #     GanttContext, ThemeContext
│           ├── hooks/            #     가상화, Undo/Redo, 키보드
│           ├── store/            #     Zustand UI 스토어
│           ├── services/         #     DataService 인터페이스
│           ├── types/            #     ConstructionTask, Milestone 등
│           └── utils/            #     날짜계산, 크리티컬패스, 검증
│
├── docs/                         # 문서
├── turbo.json                    # Turborepo 태스크 파이프라인
├── vercel.json                   # Vercel 배포 설정
├── tsconfig.base.json            # 공유 TypeScript 설정
└── package.json                  # npm workspaces 루트
```

**소스 규모:** apps/web ~270 TS/TSX 파일, sa-gantt-lib ~139 TS/TSX 파일, 총 ~87,000 LOC

---

## 3. 기술 스택

| 영역 | 기술 | 용도 |
|------|------|------|
| **런타임** | Next.js 16 + React 19 | App Router, Turbopack, React Compiler |
| **언어** | TypeScript 5 (strict) | 전체 코드베이스 |
| **DB** | Supabase (PostgreSQL + RLS) | 인증, 데이터, 실시간 |
| **상태관리** | Zustand 5 + Immer | UI 상태, Undo/Redo |
| **스타일링** | Tailwind CSS 4 + Radix UI | 유틸리티 CSS + 접근성 |
| **폼** | React Hook Form + Zod 4 | 폼 관리 + 스키마 검증 |
| **애니메이션** | Framer Motion 12 | 페이지 전환, 모션 |
| **AI** | Google Gemini API | 챗봇, 파일 검색, 공정 상담 |
| **3D** | Three.js + @thatopen/components + web-ifc | BIM/IFC 뷰어 |
| **2D** | Konva + react-konva | 캐스트 플랜 캔버스 |
| **차트** | Recharts | 대시보드 그래프 |
| **DnD** | @dnd-kit | 드래그 앤 드롭 |
| **가상화** | @tanstack/react-virtual | 10,000+ 행 렌더링 |
| **빌드** | Turborepo + Vite | 모노레포 오케스트레이션 |
| **테스트** | Jest (web) + Vitest (lib) | 단위·컴포넌트 테스트 |
| **배포** | Vercel | 자동 빌드·배포 |

---

## 4. apps/web 아키텍처

### 4.1 라우팅 (Next.js App Router)

두 개의 **Route Group**으로 레이아웃을 분리합니다:

```
src/app/
├── layout.tsx                   # 루트 레이아웃 (ThemeProvider, NavBar, GlobalChatbot)
├── page.tsx                     # / (랜딩)
│
├── (container)/                 # ← 표준 컨테이너 레이아웃 (max-width + padding)
│   ├── layout.tsx               #   ErrorBoundary + Container wrapper
│   ├── posts/                   #   게시판 CRUD
│   ├── projects/                #   프로젝트 목록 / 상세
│   ├── profile/                 #   사용자 프로필
│   └── admin/                   #   관리자 전용 (buildings, users, db-checker, promote)
│
├── (fullscreen)/                # ← 풀스크린 레이아웃 (제약 없음)
│   └── projects/[id]/gantt/     #   간트차트 전체화면
│
├── api/                         # API 라우트
│   ├── gemini/                  #   AI 엔드포인트 (10개)
│   ├── admin/buildings/         #   건물 관리 API
│   └── users/promote-to-admin/  #   역할 승격
│
├── auth/callback/               # OAuth 콜백
├── login/, signup/              # 인증 페이지
├── home/                        # 대시보드 홈
└── file-search/                 # AI 파일 검색
```

### 4.2 컴포넌트 계층

```
RootLayout
├── ThemeProvider (다크/라이트 모드)
├── LoadingBar (글로벌 페이지 전환 인디케이터)
├── NavBar (서버 컴포넌트 → NavBarContent 클라이언트)
│   ├── AdminDropdown
│   ├── UserDropdown
│   └── MobileMenu
├── <main>
│   ├── (container)/layout → ErrorBoundary → Container
│   └── (fullscreen)/layout → ErrorBoundary
├── GlobalChatbot (AI 어시스턴트, 페이지 인식)
└── Toaster (sonner 알림)
```

**컴포넌트 디렉토리** (17개 주요 그룹):

| 디렉토리 | 역할 |
|-----------|------|
| `buildings/` | 건물 관리, 공정표, 물량 입력 (가장 큰 모듈) |
| `castplan/` | 2D 캔버스 타설 계획도 (Konva) |
| `ifc-viewer/` | BIM/IFC 3D 뷰어 |
| `projects/` | 프로젝트 CRUD, 간트차트 통합 |
| `global/` | GlobalChatbot, QuickQuestions |
| `dashboard/` | KPI 카드, 진척률 차트 |
| `file-search/` | AI 기반 문서 검색 |
| `ui/` | shadcn/ui 프리미티브 (22개) |
| `common/` | PageHeader, ConfirmDialog, MarkdownRenderer |

### 4.3 데이터 플로우

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  Server Component ──(SSR)──→ requireAuth() → Supabase(서버)  │
│       │                              ↓                       │
│       └──→ Client Component ──→ Service Layer → Supabase(클) │
│                │                     ↓                       │
│                └──→ API Route ──→ Gemini AI                  │
│                                                              │
│  State:  Zustand Store ←──→ Custom Hooks ←──→ Components     │
│  Cache:  TTL Memory Cache (5분) ← Service Layer              │
│  Forms:  React Hook Form + Zod Schema ← Component           │
└─────────────────────────────────────────────────────────────┘
```

**패턴 요약:**
- **서버 컴포넌트**: 인증 확인 후 props 전달 (`requireAuth()`)
- **클라이언트 컴포넌트**: Service Layer → Supabase 클라이언트 (싱글톤)
- **API 라우트**: AI 기능 전용 (Server Actions 미사용)
- **캐시**: TTL 기반 인메모리 캐시 (`lib/services/cache.ts`)

### 4.4 인증

**Supabase Auth** 기반 3중 클라이언트 구조:

| 클라이언트 | 파일 | 용도 |
|-----------|------|------|
| **Server** | `lib/supabase/server.ts` | 서버 컴포넌트에서 쿠키 기반 세션 |
| **Middleware** | `lib/supabase/middleware.ts` | 요청마다 세션 갱신 |
| **Browser** | `lib/supabase/client.ts` | 클라이언트 컴포넌트 (싱글톤) |

**미들웨어 흐름:**
1. 모든 라우트에서 `updateSession()` 실행 (정적 자산/API 제외)
2. 인증된 사용자: `/login` → `/home` 리다이렉트
3. 미인증 사용자: 보호 라우트 → `/` 리다이렉트

**권한 시스템** (`lib/permissions/`):
- 역할: `admin` > `main_user` > `vip_user` > `user`
- 유틸: `isSystemAdmin()`, `hasMinimumRole()`, `isRoleHigherOrEqual()`

### 4.5 상태관리

| 레이어 | 도구 | 범위 |
|--------|------|------|
| **글로벌 UI** | Zustand (`useTabContextStore`) | 탭 컨텍스트, 챗봇 연동 |
| **폼** | React Hook Form + Zod | 컴포넌트 로컬 |
| **서버 데이터** | Service Layer + Cache | 비동기 데이터 |
| **커스텀 훅** | `useAsyncData`, `usePageContext` 등 | 재사용 로직 |

### 4.6 AI 통합 (Google Gemini)

**3개 AI 서비스:**

| 서비스 | API 라우트 | 모델 | 역할 |
|--------|-----------|------|------|
| **글로벌 챗봇** | `/api/gemini/global-chat` | gemini-2.5-pro/flash | 14개 페이지별 컨텍스트 인식 |
| **공정 상담** | `/api/gemini/process-plan-chat` | gemini-2.5-flash | 건물 데이터 기반 공정 상담 |
| **파일 검색** | `/api/gemini/*` (7개) | gemini embedding | 벡터 스토어 기반 문서 검색 |

**파일 업로드 보안:** MIME 검증, 매직 바이트 확인, 이중 확장자 차단, 10MB 제한

---

## 5. packages/sa-gantt-lib 아키텍처

### 5.1 구조 개요

건설 현장에 특화된 **Controlled Component** 간트 차트 라이브러리입니다.

```
src/lib/
├── index.ts              # Public API (290 lines)
├── style.css             # 기본 스타일 (14KB)
│
├── components/           # UI 계층
│   ├── GanttChart/       #   메인 오케스트레이터
│   ├── GanttSidebar/     #   좌측 패널 (태스크 목록)
│   ├── GanttTimeline/    #   우측 패널 (SVG 바, 의존성)
│   │   ├── renderers/    #     SVG 렌더러 (GridLines, TaskBars, Labels)
│   │   └── hooks/        #     드래그 전략 (Strategy Pattern)
│   │       └── dragStrategies/
│   ├── forms/            #   모달 폼 (태스크/마일스톤 편집)
│   └── ui/               #   재사용 프리미티브
│
├── context/              # React Context
│   ├── GanttContext.tsx   #   Props/콜백 배포
│   └── ThemeContext.tsx   #   테마 상태
│
├── store/                # Zustand
│   └── useGanttStore.ts  #   UI 전용 상태 (선택, 확장, 드래그)
│
├── hooks/                # 커스텀 훅
│   ├── useGanttVirtualization.ts  # @tanstack/react-virtual
│   ├── useHistory.ts              # Immer 패치 기반 Undo/Redo
│   └── useColumnResizer.ts        # 컬럼 너비 드래그
│
├── services/             # 데이터 추상화
│   ├── DataService.ts    #   인터페이스 (추상)
│   ├── LocalStorageService.ts  # 구현체
│   └── excelExport.ts    #   Excel 내보내기
│
├── types/                # 타입 정의 (6 파일)
│   ├── core.ts           #   ConstructionTask, Milestone, Dependency
│   ├── calendar.ts       #   CalendarSettings, Holiday
│   ├── props.ts          #   GanttChartProps
│   └── constants.ts      #   GANTT_COLORS, GANTT_LAYOUT
│
└── utils/                # 순수 함수 (15 모듈)
    ├── date/             #   날짜 계산 엔진 (9 파일)
    │   ├── workingDays.ts     # 영업일 계산 (공휴일 제외)
    │   ├── dualCalendar.ts    # 이중 달력 (영업일 + 역일)
    │   └── koreanHolidays.ts  # 2025-2027 한국 공휴일
    ├── criticalPath/     #   크리티컬 패스 알고리즘
    ├── dependencyGraph.ts #  순환 의존성 감지 (DFS)
    └── hierarchyValidation.ts  # 부모-자식 규칙 검증
```

### 5.2 데이터 모델

#### 핵심 엔티티: ConstructionTask

```
ConstructionTask
├── id, name, parentId
├── wbsLevel: 1 (공구공정표) | 2 (주공정표)
├── type: BLOCK | CP | GROUP | TASK
├── startDate, endDate
├── dependencies: Dependency[]
│
├── cp?: CPData           ← Level 1 전용
│   ├── workDaysTotal         (Vermilion 색상)
│   └── nonWorkDaysTotal      (Teal 색상)
│
├── task?: TaskData       ← Level 2 전용
│   ├── netWorkDays           (Red - 중앙 세그먼트)
│   ├── indirectWorkDaysPre   (Blue - 좌측 세그먼트)
│   ├── indirectWorkDaysPost  (Blue - 우측 세그먼트)
│   ├── workOnSaturdays/Sundays/Holidays
│   └── quantity, unit, dailyOutput, crew
│
└── group?: GroupData     ← GROUP 타입 전용
```

#### 타입 계층 규칙

```
BLOCK (공구) ──→ CP 또는 BLOCK 포함 가능
  └── CP (공정) ──→ GROUP 또는 TASK 포함 가능
        ├── GROUP ──→ GROUP 또는 TASK 포함 가능
        └── TASK (리프) ──→ 하위 불가
```

#### 의존성 (Anchor Point 시스템)

```
Dependency
├── type: FS | SS | FF | SF
├── lag: number (양수/음수 가능)
├── sourceAnchor: START | NET_WORK_START | NET_WORK_END | END
└── targetAnchor: START | NET_WORK_START | NET_WORK_END | END
```

Detail View에서는 바의 **4개 앵커 포인트** 중 선택하여 의존성을 연결합니다:
`[START]──[Blue]──[NET_WORK_START]──[Red]──[NET_WORK_END]──[Blue]──[END]`

### 5.3 뷰 모드

| 뷰 모드 | 한글명 | 줌 기본값 | 표시 엔티티 |
|---------|--------|----------|------------|
| **MASTER** | 공구공정표 | MONTH (2px/day) | BLOCK, CP (wbsLevel=1) |
| **DETAIL** | 주공정표 | DAY (20px/day) | GROUP, TASK (wbsLevel=2, activeCPId 하위) |
| **UNIFIED** | 통합 뷰 | WEEK (10px/day) | 전체 레벨 |

**Compact Mode** (DETAIL/UNIFIED): 행 높이 축소 (30px → 12px/21px)

### 5.4 렌더링

**하이브리드 렌더링:** Sidebar(DOM, 가상화) + Timeline(SVG)

```
┌──────────────────────────────────────────────────────────┐
│  GanttChart (오케스트레이터)                                │
│                                                           │
│  ┌─────────────┐  ┌──────────────────────────────────┐   │
│  │ GanttSidebar │  │ GanttTimeline                    │   │
│  │ (DOM)        │  │ (SVG)                            │   │
│  │              │  │                                  │   │
│  │ 태스크 목록   │  │ <svg>                            │   │
│  │ 컬럼 헤더     │  │   <defs/> (그라디언트, 마커)       │   │
│  │ 컨텍스트 메뉴 │  │   <GridLinesRenderer/>           │   │
│  │ 인라인 편집   │  │   <TaskBarsRenderer/>            │   │
│  │              │  │   <GroupDependencyLines/>        │   │
│  │ @tanstack/   │  │   <MilestoneDashLines/>          │   │
│  │ react-virtual│  │   <TaskLabelsRenderer/>          │   │
│  │              │  │   <MilestoneMarker/>             │   │
│  │              │  │   <DragGhost/>                   │   │
│  │              │  │   <MultiSelectOverlay/>          │   │
│  │              │  │ </svg>                           │   │
│  └─────────────┘  └──────────────────────────────────┘   │
│                                                           │
│  스크롤 동기화: Sidebar ↔ Timeline (수직), Header ↔ Content (수평) │
└──────────────────────────────────────────────────────────┘
```

**바 렌더링 방식:**
- **Master View**: 2-세그먼트 (Vermilion 영업일 + Teal 비영업일)
- **Detail View**: 3-세그먼트 (Blue 간접선행 + Red 순작업 + Blue 간접후행) + 공휴일 마스킹

**드래그 전략 (Strategy Pattern):**
- Move: 전체 바 이동
- MoveNet: 순작업 세그먼트만 이동
- ResizePre / ResizePost: 시작/종료일 조정
- Boundary: 간접일수 조정

### 5.5 상태 패턴

**2-Tier 아키텍처:**

```
Tier 1: 데이터 상태 (Props)          Tier 2: UI 상태 (Zustand)
┌────────────────────────┐          ┌──────────────────────────┐
│ tasks, milestones      │          │ viewMode, zoomLevel      │
│ holidays, calendar     │          │ selectedTaskIds (Set)    │
│ groupDependencies      │          │ expandedTaskIds (Set)    │
│                        │          │ sidebarWidth             │
│ ← 부모에서 props 전달    │          │ isDragging, dragType     │
│ ← 콜백으로 변경 알림      │          │ isCompactMode            │
│                        │          │                          │
│ onTaskUpdate()         │          │ ← 라이브러리 내부 관리      │
│ onTaskCreate()         │          │ ← Selector 훅으로 구독     │
│ onMilestoneCreate()    │          │                          │
└────────────────────────┘          └──────────────────────────┘
```

**왜 Context + Store 모두 사용하나?**
- **Context**: 부모에서 전달된 props/콜백 (불변, 이벤트 기반)
- **Store**: 일시적 UI 상태 (선택, 호버, 드래그 — 빈번한 업데이트)

---

## 6. 연결 구조 (Web ↔ Library)

### 통합 포인트

```
apps/web                                   packages/sa-gantt-lib
──────────                                 ──────────────────────

FullscreenGanttPage.tsx ──import──→ GanttChart, useHistory, types
        │
        ├─ SupabaseGanttDataService.ts     DataService 인터페이스 구현
        │   └─ Supabase ↔ ConstructionTask 매핑
        │
        ├─ useHistory() ←─────────────────→ Immer 패치 기반 Undo/Redo
        │
        └─ 콜백 연결:
            onTaskUpdate → Supabase UPDATE
            onTaskCreate → Supabase INSERT
            onTaskDelete → Supabase DELETE
            onMilestoneUpdate → Supabase UPDATE
```

### 데이터 변환 계층

```
Supabase DB (snake_case)
    ↓ SupabaseGanttDataService
ConstructionTask (camelCase, Date 객체)
    ↓ props
GanttChart 컴포넌트
    ↓ 콜백 (onTaskUpdate 등)
ConstructionTask (수정된 필드)
    ↓ SupabaseGanttDataService
Supabase DB
```

### Import 구조

```typescript
// apps/web에서의 사용
import { GanttChart, useHistory } from 'sa-gantt-lib';
import type { ConstructionTask, Milestone, GanttChartProps } from 'sa-gantt-lib';
import 'sa-gantt-lib/style.css';
```

---

## 7. 빌드 & 배포 파이프라인

### 빌드 순서 (⚠️ 필수)

```
sa-gantt-lib (Vite)          @contech/web (Next.js)
──────────────────           ───────────────────────
tsc                          next build
  ↓                             ↓
vite build                   .next/ 출력
  ↓                             ↑
dist/                        dist/ 참조
├── index.es.js (ESM)        (이전 버전 참조 위험!)
├── index.cjs (CommonJS)
├── style.css
└── index.d.ts

✅ 올바른 순서: npm run build:lib → npm run build
❌ 라이브러리 빌드 누락 시 web이 이전 dist/ 참조
```

### Turborepo 파이프라인

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],          // 의존 패키지 먼저 빌드
      "outputs": [".next/**", "dist/**"]  // 캐시 대상
    }
  }
}
```

### Vercel 배포

```json
// vercel.json
{
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build:lib && npm run build",
  "outputDirectory": "apps/web/.next"
}
```

**배포 흐름:** Push → Vercel → `npm install` → `build:lib` → `build` → 배포

### 주요 빌드 설정

| 설정 | 값 | 효과 |
|------|-----|------|
| React Compiler | `reactCompiler: true` | 자동 메모이제이션 |
| Turbopack | `turbopack: {}` | 빠른 개발 서버 |
| `"use client"` banner | Vite rollup output | Next.js App Router 호환 |
| Peer Dependencies | react ^18/19 | 호스트 앱에서 제공 |

---

## 8. 주요 아키텍처 패턴

### 에러 처리

```
┌───────────────┐     ┌──────────────────┐     ┌─────────────┐
│ ErrorBoundary │     │  handleError()   │     │  ApiError   │
│ (컴포넌트)      │     │  (유틸)          │     │  (타입)     │
│               │     │                  │     │             │
│ React 에러     │     │ 1. toApiError()  │     │ code        │
│ catch →       │     │ 2. logger.error  │     │ message     │
│ 폴백 UI +      │     │ 3. toast.error   │     │ statusCode  │
│ 재시도 버튼     │     │ 4. onAuthError?  │     │ details     │
└───────────────┘     └──────────────────┘     └─────────────┘
```

### 검증 (Zod 스키마)

```
lib/schemas/index.ts
├── loginSchema, signupSchema        ← 인증
├── postSchema, commentSchema        ← 게시판
├── projectSchema                    ← 프로젝트
├── buildingBasicSchema             ← 건물
├── floorHeightsSchema              ← 층별 높이
└── ValidationMessages (한글)        ← 에러 메시지
```

### 성능 최적화

| 기법 | 적용 위치 | 효과 |
|------|----------|------|
| **가상화** | GanttTimeline, GanttSidebar | 10,000+ 행 중 ~30행만 렌더링 |
| **React Compiler** | Next.js 전체 | 자동 useMemo/useCallback |
| **Zustand Selector** | useGanttViewState 등 | 불필요한 리렌더 방지 |
| **React.memo** | 모든 바 컴포넌트 | 커스텀 비교 함수 |
| **TTL Cache** | Service Layer | 5분 인메모리 캐시 |
| **Supabase 싱글톤** | Browser Client | WebSocket 재사용 |
| **Turbopack** | 개발 서버 | 빠른 HMR |

### 서비스 레이어

```
lib/services/
├── 범용 서비스
│   ├── projects.ts              ← 프로젝트 CRUD
│   ├── buildings.ts             ← 건물 관리
│   ├── posts.client/server.ts   ← 게시판 (클라이언트/서버 분리)
│   └── comments.client/server.ts
│
├── Supabase 특화
│   ├── SupabaseBuildingDataService.ts  ← 건물 데이터 집약
│   └── SupabaseGanttDataService.ts     ← 간트 ↔ DB 매핑
│
├── AI 서비스
│   ├── gemini.ts               ← Gemini API 클라이언트
│   ├── global-chatbot.ts       ← 챗봇 비즈니스 로직
│   └── process-plan-chatbot.ts ← 공정 상담 로직
│
└── 유틸리티
    ├── cache.ts                ← TTL 인메모리 캐시
    └── unitRates.ts            ← 단가 데이터
```

---

## 9. 물량 해석 시스템 (Quantity Resolution)

### 9.1 개요

공정계획에서 각 세부공종의 **수량(물량)**을 산출하는 시스템입니다. 건물의 층별/공종별 물량 입력 데이터를 기반으로, 공정 모듈이 참조하는 수량을 자동으로 해석합니다.

**Strangler Fig 패턴**으로 마이그레이션: 새로운 `resolveProcessQuantity`가 레거시 함수를 내부적으로 래핑하여 점진적 전환을 지원합니다.

### 9.2 아키텍처 레이어

```
┌─────────────────────────────────────────────────────────────┐
│  UI 디스플레이 레이어                                          │
│  BuildingProcessPlanPage / BasementProcessPlanPage          │
│  DailyWorkerInputDashboard / process-row-helpers            │
│                                                             │
│  ↓ resolveProcessQuantity(building, ref, floorLabel?)       │
├─────────────────────────────────────────────────────────────┤
│  계산 레이어                                                  │
│  process-days-calculator.ts / useProcessCalculation.ts      │
│                                                             │
│  ↓ resolveProcessQuantity(building, ref, floorLabel?)       │
├─────────────────────────────────────────────────────────────┤
│  통합 해석기 (Resolver)                                       │
│  process-quantity-resolver.ts                               │
│  ┌──────────────┬──────────────┬──────────────┐             │
│  │ resolveBy    │ resolveBy    │ resolveBy    │             │
│  │ Category     │ Floor        │ Combined     │             │
│  └──────┬───────┴──────┬───────┴──────┬───────┘             │
│         ↓              ↓              ↓                     │
├─────────────────────────────────────────────────────────────┤
│  레거시 데이터 접근 (내부 전용)                                 │
│  quantity-reference.ts                                      │
│  getQuantityByReference() / getQuantityFromFloor()          │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 타입 시스템

```typescript
// lib/types/process-quantity.ts

interface SemanticQuantityReference {
  tradeField: string;    // 'gangForm' | 'alForm' | 'formwork' | ...
  subField: string;      // 'areaM2' | 'ton' | 'volumeM3'
  ratio: number;         // 배율 (기본 1, stripClean은 2)
  sourceType: string;    // 'category' | 'floor' | 'combined'
  tradeGroup?: string;   // '버림' | '기초' (category용)
  combineFloors?: string[]; // ['B1', 'B2'] (combined용)
}

// 컬럼→공종 매핑 (레거시 Excel 참조 변환용)
const TRADE_FIELD_MAP: Record<string, string> = {
  B: 'gangForm', C: 'alForm', D: 'formwork',
  E: 'stripClean', F: 'rebar', G: 'concrete', U: 'euroForm',
};
```

### 9.4 해석 전략 (Strategy)

| sourceType | 해석 전략 | 예시 |
|-----------|----------|------|
| `category` | 버림/기초 floorTrades에서 tradeGroup으로 조회 | 버림 갱폼 면적 |
| `floor` | 특정 층 floorLabel로 조회 | 3F 철근 톤수 |
| `combined` | 여러 층 합산 | B1+B2 콘크리트 |

### 9.5 마이그레이션 브릿지

```typescript
// quantity-reference-migration.ts
parseLegacyReference(reference: string, category: ProcessCategory)
  → SemanticQuantityReference | null

// 변환 예시:
// 'D6'     → { tradeField: 'formwork', subField: 'areaM2', sourceType: 'floor' }
// 'F7*0.45' → { tradeField: 'rebar', subField: 'ton', ratio: 0.45, sourceType: 'floor' }
// 'F_B1B2_COMBINED' → { tradeField: 'rebar', sourceType: 'combined', combineFloors: ['B1','B2'] }
```

### 9.6 파일 구조

```
lib/
├── types/
│   └── process-quantity.ts          # SemanticQuantityReference 타입, TRADE_FIELD_MAP
├── utils/
│   ├── process-quantity-resolver.ts # 통합 해석기 (단일 진입점)
│   ├── quantity-reference-migration.ts # 레거시 → 시맨틱 변환 브릿지
│   ├── quantity-reference.ts        # 레거시 데이터 접근 (내부 전용)
│   ├── process-calculation.ts       # 인원/일수/장비 계산 공식
│   ├── process-days-calculator.ts   # 공정일수 계산 엔진
│   └── process-row-helpers.ts       # UI 행별 물량 조회 헬퍼
└── data/
    └── process-modules.ts           # 공정 모듈 정의 (quantityRef 포함)
```

---

## 10. 대형 파일 목록 (리팩토링 후보)

> 500 LOC 이상의 파일. 단일 책임 원칙(SRP) 관점에서 분리를 검토할 수 있습니다.

| 파일 | LOC | 비고 |
|------|-----|------|
| `components/buildings/BasementProcessPlanPage.tsx` | 2,469 | 지하층 공정표 전체 |
| `components/buildings/BuildingProcessPlanPage.tsx` | 2,249 | 지상층 공정표 전체 |
| `components/buildings/FloorTradeTable.tsx` | 1,993 | 층별 공종 테이블 |
| `components/buildings/DetailedFloorTradeTable.tsx` | 1,977 | 상세 층별 공종 |
| `lib/types.ts` | 1,334 | DB 타입 전체 정의 |
| `lib/data/process-modules.ts` | 1,171 | 공정 모듈 데이터 |
| `lib/utils/dxf-parser.ts` | 1,137 | DXF 파싱 유틸 |
| `sa-gantt-lib/src/App.tsx` | 1,065 | 데모 앱 (비배포) |
| `components/projects/FullscreenGanttPage.tsx` | 1,047 | 간트 통합 페이지 |
| `lib/services/SupabaseBuildingDataService.ts` | 870 | 건물 데이터 서비스 |
| `components/buildings/FloorSettingsTable.tsx` | 868 | 층 설정 테이블 |
| `lib/services/SupabaseGanttDataService.ts` | 836 | 간트 DB 서비스 |
| `lib/services/buildings.ts` | 830 | 건물 서비스 |
| `components/buildings/PlannedUnitRatePage.tsx` | 820 | 단가 산출 페이지 |
| `components/buildings/process-logic/ProcessModuleEditModal.tsx` | 783 | 공정 모듈 편집 모달 |
| `components/buildings/BuildingBasicInfo.tsx` | 753 | 건물 기본정보 |
| `sa-gantt-lib/components/GanttTimeline/index.tsx` | 703 | 타임라인 메인 |
| `sa-gantt-lib/components/GanttSidebar/index.tsx` | 688 | 사이드바 메인 |
| `components/ifc-viewer/IfcViewer.tsx` | 659 | BIM 뷰어 |
| `components/global/GlobalChatbot.tsx` | 657 | AI 챗봇 |
| `lib/utils/quantity-reference.ts` | 626 | 물량 참조 로직 |
| `sa-gantt-lib/components/GanttChart/index.tsx` | 613 | 간트 오케스트레이터 |
| `components/projects/ProjectDetailClient.tsx` | 588 | 프로젝트 상세 |

---

## 11. 리팩토링/품질 현황

기준일: `2026-02-10`

- 대상: `apps/web`
- 결과: `npx eslint src` 기준 `errors: 0`, `warnings: 0`
- 주요 반영 사항:
  - 미사용 import/변수 및 dead code 정리
  - `react-hooks/exhaustive-deps` 및 `set-state-in-effect` 패턴 정리
  - `next/no-img-element`를 `next/image` 기반으로 전환
  - 타입 안정성 보강(`no-explicit-any`, 빈 타입 선언 정리)

상세 로그: `docs/refactoring_status.md`
