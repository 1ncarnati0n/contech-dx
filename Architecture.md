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
│       ├── sql/                  #   DB 스키마, 마이그레이션, 시드
│       │   ├── schema/
│       │   ├── migrations/
│       │   └── seeds/
│       └── src/
│           ├── app/              #     App Router (페이지, API 라우트)
│           ├── features/         #     도메인별 기능 모듈 (10개 도메인)
│           ├── shared/           #     전역 공유 모듈 (컴포넌트, 훅, 유틸)
│           ├── styles/           #     글로벌 스타일
│           └── types/            #     DB 생성 타입 (supabase generate)
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

### 4.1 설계 원칙

**Feature-based Architecture + View/Service/Repository 3-Layer 패턴**

```
src/
├── app/              # 라우팅 전용 (thin pages — feature 모듈 조합)
├── features/         # 도메인별 기능 모듈 (View/Service/Repository)
└── shared/           # 전역 공유 코드 (UI, 인프라, 유틸)
```

- **app/**: Next.js App Router 페이지. 인증 확인 후 feature 컴포넌트를 렌더링하는 thin layer
- **features/**: 도메인별로 격리된 기능 모듈. 각 모듈은 3-Layer 패턴을 따름
- **shared/**: 여러 feature에서 공유하는 컴포넌트, 훅, 유틸리티, 인프라 코드

### 4.2 Feature Module 3-Layer 패턴

각 feature는 View/Service/Repository 관심사 분리를 적용합니다.
향후 FastAPI 백엔드로 전환 시, Repository 레이어만 교체하면 됩니다.

```
features/<domain>/
├── view/           # UI 렌더링 전용 (React 컴포넌트)
│                   #   - 비즈니스 로직 없음 (Service 훅에 위임)
│                   #   - Supabase/DB를 직접 호출하지 않음
│
├── service/        # 비즈니스 로직 + 상태 관리 훅 + 순수 함수
│                   #   - useXxx() 커스텀 훅: 상태 + 오케스트레이션
│                   #   - xxxHelpers.ts: 순수 계산/변환 함수
│                   #   - Repository를 호출하여 데이터 접근
│
├── repository/     # 데이터 접근 (Supabase CRUD / API fetch)
│                   #   - 순수 CRUD 함수만 제공
│                   #   - DB Row 타입 ↔ 도메인 모델 매핑
│                   #   - 교체 대상 (Supabase → FastAPI)
│
├── data/           # 정적 데이터 (선택적)
└── types/          # 도메인 타입 (선택적)
```

| Layer | 역할 | 의존 방향 | 마이그레이션 시 |
|-------|------|----------|---------------|
| **View** | UI 렌더링, props 전달 | → Service | 변경 없음 |
| **Service** | 비즈니스 로직, 상태 관리, 에러 처리 | → Repository | 그대로 이전 |
| **Repository** | DB 통신, Row 매핑 | → Supabase | FastAPI 클라이언트로 교체 |

### 4.3 Feature 도메인 목록

```
features/
├── admin/            # 관리자 기능 (사용자 역할 관리)
│   ├── view/         #   UpdateRoleButton
│   ├── service/      #   changeUserRole, promoteCurrentUserToAdmin
│   └── repository/   #   users.client (Supabase)
│
├── ai-chat/          # AI 챗봇 & 파일 검색
│   ├── view/         #   GlobalChatbot, FileSearch, ProcessPlanChat
│   │   ├── file-search/
│   │   ├── global/
│   │   └── process-plan-chat/
│   ├── service/      #   gemini API, chatbot logic, context builder
│   ├── data/         #   chatbot prompts, glossary
│   └── types/        #   file-search, ProcessPlanChatbot types
│
├── auth/             # 인증 (로그인, 회원가입, 비밀번호 재설정)
│   ├── view/         #   LoginForm, SignupForm, LogoutButton, ResetPasswordForm
│   ├── service/      #   login, signup, logout, error mapping
│   └── repository/   #   supabase.auth 래핑
│
├── building/         # 동(Building) 관리 — 가장 큰 도메인
│   ├── basic-info/   #   건물 기본정보 (service/ + view/)
│   ├── process-logic/#   공정로직 (service/ + view/)
│   ├── process-plan/ #   공정계획 수립 (service/ + view/)
│   ├── quantity/     #   물량 입력 (service/ + view/)
│   ├── unit-rate/    #   단가 산출 (service/ + view/)
│   ├── geological-data/# 지질 데이터 (view/)
│   ├── pouring-section/# 타설구간 (service/ + view/)
│   ├── shared/       #   동 공통 (repository/, service/, view/)
│   ├── data/         #   공정 모듈 정적 데이터
│   ├── hooks/        #   공통 훅
│   └── components/   #   공통 컴포넌트
│
├── castplan/         # 콘크리트 타설 계획 (2D Konva 캔버스)
│   ├── view/         #   CastPlanCanvas, layers, panels
│   └── service/      #   DXF 파싱, 기하 계산, 하이라이트
│
├── dashboard/        # 대시보드
│   ├── view/         #   ConstructionDashboard, KPICards, TaktView
│   └── service/      #   loadBuildingsForDashboard
│
├── gantt/            # 간트차트
│   ├── view/         #   FullscreenGanttPage, GanttChartPage, FullscreenGanttHeader
│   ├── service/      #   useFullscreenGantt, useGanttChartPage, gantt-data.service
│   │                 #   gantt-mapper, gantt-cp-calculator, gantt-chart-helpers
│   │                 #   process-to-gantt-converter
│   └── repository/   #   GanttRepository (순수 CRUD)
│
├── post/             # 게시판 CRUD
│   ├── view/         #   PostForm, PostsList, PostsTable, CommentForm, CommentList
│   ├── service/      #   post/comment service, usePostHashScroll, postFormatters
│   └── repository/   #   posts.client/server, comments.client/server
│
├── profile/          # 사용자 프로필
│   ├── view/         #   ProfileEditForm
│   ├── service/      #   updateProfile
│   └── repository/   #   profile.repository (Supabase)
│
└── project/          # 프로젝트 관리
    ├── view/         #   ProjectList, ProjectCard, ProjectTeamPage, Settings 등
    ├── service/      #   useProjectTeam, useProjectPermissions, project.constants
    │                 #   number-formatting.utils, project-status
    └── repository/   #   projects, projectMembers (Supabase)
```

### 4.4 Shared 모듈 구조

여러 feature에서 공유하는 범용 코드입니다.

```
shared/
├── components/
│   ├── ui/               # 디자인 시스템 (Button, Card, Dialog, Spinner 등)
│   ├── common/           # 범용 UI (PageHeader, ConfirmDialog, MarkdownRenderer)
│   ├── layout/           # 레이아웃 (NavBar, MobileMenu, ThemeProvider, UserDropdown)
│   ├── home/             # 홈/랜딩 페이지
│   └── ifc-viewer/       # BIM 3D 뷰어
│
├── hooks/                # 공통 훅
│   ├── useAsyncData      #   비동기 데이터 로딩 + 에러 처리
│   ├── useRealtimeCacheSync  # Supabase Realtime 캐시 동기화
│   ├── useErrorHandler   #   에러 핸들링 유틸
│   └── ...
│
├── lib/                  # 인프라 코드
│   ├── supabase/         #   client, server, middleware, withAuth
│   ├── auth/             #   requireAuth, requireProjectMember
│   ├── permissions/      #   역할 기반 권한 체크 (client/server/shared)
│   ├── api/              #   withValidation (API 라우트 래퍼)
│   ├── schemas/          #   Zod 검증 스키마
│   ├── cache.ts          #   TTL 인메모리 캐시
│   └── utils.ts          #   cn() 등 범용 유틸
│
├── stores/               # Zustand 전역 스토어
│   └── useTabContextStore  # 탭 컨텍스트 + 챗봇 연동
│
├── constants/            # 상수 정의
├── types/                # 공유 타입 (types.ts, process-quantity.ts, error.ts)
└── utils/                # 유틸리티 (api-error, apiAuth, error-handler, logger, formatters)
```

### 4.5 라우팅 (Next.js App Router)

세 개의 **Route Group**으로 레이아웃을 분리합니다:

```
src/app/
├── layout.tsx                   # 루트 레이아웃 (ThemeProvider, NavBar, GlobalChatbot)
├── page.tsx                     # / (랜딩)
│
├── (auth)/                      # ← 인증 페이지 (NavBar 없음)
│   ├── layout.tsx               #   최소 레이아웃
│   ├── login/                   #   로그인
│   ├── signup/                  #   회원가입
│   └── reset-password/          #   비밀번호 재설정
│
├── (container)/                 # ← 표준 컨테이너 레이아웃 (max-width + padding)
│   ├── layout.tsx               #   ErrorBoundary + Container wrapper
│   ├── home/                    #   대시보드 홈
│   ├── posts/                   #   게시판 CRUD
│   ├── profile/                 #   사용자 프로필
│   ├── admin/                   #   관리자 전용 (buildings, users, db-checker, promote)
│   └── projects/
│       ├── page.tsx             #   프로젝트 목록
│       └── [id]/                #   프로젝트 상세 (nested layout)
│           ├── layout.tsx       #     프로젝트 사이드바 + 탭 레이아웃
│           ├── page.tsx         #     프로젝트 개요
│           ├── basic-info/      #     건물 기본정보
│           ├── quantity/        #     물량 입력
│           ├── detailed-quantity/#    상세 물량 입력
│           ├── process-logic/   #     공정로직
│           ├── building-process-plan/ # 지상층 공정계획
│           ├── basement-process-plan/ # 지하층 공정계획
│           ├── gantt-chart/     #     간트차트 탭
│           ├── unit-rate/       #     단가 산출
│           ├── executed-unit-rate/#   실행 단가
│           ├── geological-data/ #     지질 데이터
│           ├── pouring-section/ #     타설구간
│           ├── ifc-viewer/      #     BIM 3D 뷰어
│           ├── documents/       #     문서 관리
│           ├── team/            #     팀 관리
│           └── settings/        #     프로젝트 설정
│
├── (fullscreen)/                # ← 풀스크린 레이아웃 (제약 없음)
│   ├── projects/[id]/gantt/     #   간트차트 전체화면
│   └── file-search/             #   AI 파일 검색
│
├── api/                         # API 라우트
│   ├── gemini/                  #   AI 엔드포인트 (10개)
│   ├── admin/buildings/         #   건물 관리 API
│   └── users/promote-to-admin/  #   역할 승격
│
└── auth/callback/               # OAuth 콜백
```

### 4.6 데이터 플로우

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser                                      │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  Server Component ──(SSR)──→ requireAuth() → Supabase(서버)       ││
│  │       │                              ↓                            ││
│  │       └──→ Client Component (View)                                ││
│  │                │                                                  ││
│  │                ├──→ Service Hook ──→ Repository ──→ Supabase      ││
│  │                │                                                  ││
│  │                └──→ API Route ──→ Gemini AI                       ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  State:  Zustand Store ←──→ Custom Hooks ←──→ View Components        │
│  Cache:  TTL Memory Cache (5분) ← Service/Repository Layer           │
│  Forms:  React Hook Form + Zod Schema ← View Component               │
└──────────────────────────────────────────────────────────────────────┘
```

**패턴 요약:**
- **서버 컴포넌트**: 인증 확인 후 props 전달 (`requireAuth()`)
- **View 컴포넌트**: Service 훅 호출 → Repository → Supabase (View에서 Supabase 직접 호출 없음)
- **API 라우트**: AI 기능 전용 (Server Actions 미사용)
- **캐시**: TTL 기반 인메모리 캐시 (`shared/lib/cache.ts`)

### 4.7 인증

**Supabase Auth** 기반 3중 클라이언트 구조:

| 클라이언트 | 파일 | 용도 |
|-----------|------|------|
| **Server** | `shared/lib/supabase/server.ts` | 서버 컴포넌트에서 쿠키 기반 세션 |
| **Middleware** | `shared/lib/supabase/middleware.ts` | 요청마다 세션 갱신 |
| **Browser** | `shared/lib/supabase/client.ts` | 클라이언트 컴포넌트 (싱글톤) |

**권한 시스템** (`shared/lib/permissions/`):
- 역할: `admin` > `main_user` > `vip_user` > `user`
- 유틸: `isSystemAdmin()`, `hasMinimumRole()`, `isRoleHigherOrEqual()`

### 4.8 상태관리

| 레이어 | 도구 | 범위 |
|--------|------|------|
| **글로벌 UI** | Zustand (`useTabContextStore`) | 탭 컨텍스트, 챗봇 연동 |
| **폼** | React Hook Form + Zod | 컴포넌트 로컬 |
| **서버 데이터** | Service/Repository Layer + Cache | 비동기 데이터 |
| **커스텀 훅** | `useAsyncData`, `usePageContext` 등 | 재사용 로직 |

### 4.9 AI 통합 (Google Gemini)

**3개 AI 서비스** (`features/ai-chat/`에서 관리):

| 서비스 | API 라우트 | 역할 |
|--------|-----------|------|
| **글로벌 챗봇** | `/api/gemini/global-chat` | 14개 페이지별 컨텍스트 인식 |
| **공정 상담** | `/api/gemini/process-plan-chat` | 건물 데이터 기반 공정 상담 |
| **파일 검색** | `/api/gemini/*` (7개) | 벡터 스토어 기반 문서 검색 |

---

## 5. packages/sa-gantt-lib 아키텍처

### 5.1 구조 개요

건설 현장에 특화된 **Controlled Component** 간트 차트 라이브러리입니다.

```
src/lib/
├── index.ts              # Public API
├── style.css             # 기본 스타일
│
├── components/           # UI 계층
│   ├── GanttChart/       #   메인 오케스트레이터
│   ├── GanttSidebar/     #   좌측 패널 (태스크 목록)
│   ├── GanttTimeline/    #   우측 패널 (SVG 바, 의존성)
│   │   ├── renderers/    #     SVG 렌더러 (GridLines, TaskBars, Labels)
│   │   └── hooks/        #     드래그 전략 (Strategy Pattern)
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
├── types/                # 타입 정의
│   ├── core.ts           #   ConstructionTask, Milestone, Dependency
│   ├── calendar.ts       #   CalendarSettings, Holiday
│   ├── props.ts          #   GanttChartProps
│   └── constants.ts      #   GANTT_COLORS, GANTT_LAYOUT
│
└── utils/                # 순수 함수
    ├── date/             #   날짜 계산 엔진
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
├── task?: TaskData       ← Level 2 전용
└── group?: GroupData     ← GROUP 타입 전용
```

#### 타입 계층 규칙

```
BLOCK (공구) ──→ CP 또는 BLOCK 포함 가능
  └── CP (공정) ──→ GROUP 또는 TASK 포함 가능
        ├── GROUP ──→ GROUP 또는 TASK 포함 가능
        └── TASK (리프) ──→ 하위 불가
```

### 5.3 뷰 모드

| 뷰 모드 | 한글명 | 표시 엔티티 |
|---------|--------|------------|
| **MASTER** | 공구공정표 | BLOCK, CP (wbsLevel=1) |
| **DETAIL** | 주공정표 | GROUP, TASK (wbsLevel=2) |
| **UNIFIED** | 통합 뷰 | 전체 레벨 |

### 5.4 렌더링

**하이브리드 렌더링:** Sidebar(DOM, 가상화) + Timeline(SVG)

```
┌──────────────────────────────────────────────────────────┐
│  GanttChart (오케스트레이터)                                │
│  ┌─────────────┐  ┌──────────────────────────────────┐   │
│  │ GanttSidebar │  │ GanttTimeline (SVG)              │   │
│  │ (DOM)        │  │   GridLines + TaskBars +          │   │
│  │ @tanstack/   │  │   Dependencies + Milestones +     │   │
│  │ react-virtual│  │   Labels + DragGhost              │   │
│  └─────────────┘  └──────────────────────────────────┘   │
│  스크롤 동기화: Sidebar ↔ Timeline (수직/수평)              │
└──────────────────────────────────────────────────────────┘
```

### 5.5 상태 패턴

**2-Tier 아키텍처:**

| Tier | 관리 주체 | 예시 |
|------|----------|------|
| **데이터** | Props (부모 제어) | tasks, milestones, groupDependencies |
| **UI** | Zustand (라이브러리 내부) | viewMode, selectedIds, expandedIds, isDragging |

---

## 6. 연결 구조 (Web ↔ Library)

```
apps/web                                   packages/sa-gantt-lib
──────────                                 ──────────────────────

gantt/view/FullscreenGanttPage.tsx ──import──→ GanttChart, useHistory, types
        │
        ├─ gantt/service/
        │   ├─ useFullscreenGantt.ts        20+ CRUD 핸들러 통합 훅
        │   ├─ useGanttChartPage.ts         통계/import 미리보기 훅
        │   ├─ gantt-data.service.ts        DataService 인터페이스 구현
        │   ├─ gantt-mapper.ts              Row ↔ Domain 변환
        │   ├─ gantt-cp-calculator.ts       CP 재계산 순수 함수
        │   ├─ gantt-chart-helpers.ts       통계/층 라벨 압축 순수 함수
        │   └─ process-to-gantt-converter   공정계획 → 간트 변환
        │
        ├─ gantt/repository/
        │   └─ gantt.repository.ts          순수 Supabase CRUD
        │
        └─ 콜백 연결:
            onTaskUpdate → useFullscreenGantt → Repository → Supabase
            onTaskCreate → useFullscreenGantt → Repository → Supabase
            onTaskDelete → useFullscreenGantt → Repository → Supabase
```

---

## 7. 빌드 & 배포 파이프라인

### 빌드 순서

```
sa-gantt-lib (Vite)          @contech/web (Next.js)
──────────────────           ───────────────────────
tsc → vite build             next build → .next/
  ↓
dist/ (ESM + CJS + CSS + d.ts)

올바른 순서: npm run build:lib → npm run build
```

### Vercel 배포

```
Push → Vercel → npm install → build:lib → build → 배포
```

| 설정 | 값 | 효과 |
|------|-----|------|
| React Compiler | `reactCompiler: true` | 자동 메모이제이션 |
| Turbopack | `turbopack: {}` | 빠른 개발 서버 |
| `"use client"` banner | Vite rollup output | Next.js App Router 호환 |

---

## 8. 주요 아키텍처 패턴

### 에러 처리

```
ErrorBoundary (컴포넌트) → 폴백 UI + 재시도
handleError() (유틸)     → toApiError() → logger.error → toast.error
ApiError (타입)          → code, message, statusCode, details
```

### 성능 최적화

| 기법 | 적용 위치 | 효과 |
|------|----------|------|
| **가상화** | GanttTimeline, GanttSidebar | 10,000+ 행 중 ~30행만 렌더링 |
| **React Compiler** | Next.js 전체 | 자동 useMemo/useCallback |
| **Zustand Selector** | useGanttViewState 등 | 불필요한 리렌더 방지 |
| **TTL Cache** | Service/Repository Layer | 5분 인메모리 캐시 |
| **Turbopack** | 개발 서버 | 빠른 HMR |

---

## 9. 물량 해석 시스템 (Quantity Resolution)

### 9.1 개요

공정계획에서 각 세부공종의 **수량(물량)**을 산출하는 시스템입니다.
**Strangler Fig 패턴**으로 마이그레이션: 새로운 `resolveProcessQuantity`가 레거시 함수를 내부적으로 래핑합니다.

### 9.2 아키텍처 레이어

```
┌─────────────────────────────────────────────────┐
│  UI 디스플레이 (features/building/*/view/)        │
│  ↓ resolveProcessQuantity(building, ref, floor?) │
├─────────────────────────────────────────────────┤
│  통합 해석기 (process-quantity-resolver.ts)        │
│  resolveByCategory / resolveByFloor / resolveByCombined │
├─────────────────────────────────────────────────┤
│  레거시 데이터 접근 (quantity-reference.ts)        │
│  getQuantityByReference / getQuantityFromFloor    │
└─────────────────────────────────────────────────┘
```

### 9.3 해석 전략

| sourceType | 해석 전략 | 예시 |
|-----------|----------|------|
| `category` | 버림/기초 floorTrades에서 tradeGroup으로 조회 | 버림 갱폼 면적 |
| `floor` | 특정 층 floorLabel로 조회 | 3F 철근 톤수 |
| `combined` | 여러 층 합산 | B1+B2 콘크리트 |
