# ConTech-DX

건축직영공사 공정관리 시스템 (Construction Technology Digital Transformation)

## Quick Start

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build:lib    # sa-gantt-lib 빌드 (라이브러리 수정 시 필수)
npm run build        # web 앱 빌드
npm run test         # 테스트 실행
```

## Monorepo Structure

```
contech-dx/
├── apps/web/              # Next.js 16 웹 앱 (@contech/web)
├── packages/sa-gantt-lib/ # 간트차트 라이브러리
├── package.json           # npm workspaces
├── turbo.json             # Turborepo
└── vercel.json            # Vercel 배포
```

> **빌드 순서**: 라이브러리 수정 시 반드시 `npm run build:lib` → `npm run build` 순서로 빌드

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (Strict) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS 4 + Radix UI + shadcn/ui |
| AI | Google Gemini API |
| Gantt | sa-gantt-lib (자체 라이브러리) |
| 3D/BIM | @thatopen/components + Three.js |
| 2D Canvas | Konva (react-konva) |
| Form | React Hook Form + Zod |
| Testing | Jest + React Testing Library |

## Features

### 동(Building) 관리
동 생성, 층수/코어 설정, 층고 관리, 층별/공종별 물량 입력

### 공정계획
- **공정로직**: 계산 공식, 공정 모듈, 사이클 정의
- **공정계획 수립**: 일수고정/물량기반/장비기반 3가지 계산 방식
- **물량 해석**: SemanticQuantityReference 기반 통합 물량 해석 시스템
- **지상층/지하층** 개별 공정 계획
- **AI 챗봇**: Gemini API 기반 공정계획 질의응답

### 간트차트 (sa-gantt-lib)
Supabase 연동, 태스크/마일스톤 CRUD, 의존성 관리, 그룹 드래그, Undo/Redo

### BIM/IFC 3D 뷰어
IFC 파일 로드, 요소 선택, 속성 패널, 6방향 뷰 컨트롤, 투영 모드 전환

### 콘크리트 타설 계획
DXF 업로드, 타설 블록 관리, 펌프카 배치, 물량 계산

### AI 파일 검색
Gemini RAG 기반 문서 검색, 스토어 관리, 다중 파일 업로드, 출처 인용

### 대시보드
KPI 카드, 금일 인원투입현황, Takt 뷰, 동별 진행률

### 인증/권한
Supabase Auth, 4단계 역할 (admin, main_user, vip_user, user), 서버사이드 권한 체크

## Project Structure (apps/web/src)

```
app/                    # Next.js App Router
├── (container)/        # 메인 레이아웃 (admin, projects, posts, profile)
├── (fullscreen)/       # 전체화면 (간트차트)
├── api/                # API Routes (gemini, users)
├── auth/callback/      # Supabase Auth
└── file-search/        # AI 파일 검색

components/
├── ui/                 # 디자인 시스템 (Button, Card, Dialog 등)
├── buildings/          # 동/층 관리, 공정계획
├── castplan/           # 콘크리트 타설 계획
├── ifc-viewer/         # BIM 3D 뷰어
├── projects/           # 프로젝트 관리, 간트차트
├── dashboard/          # 대시보드
└── file-search/        # AI 파일 검색

lib/
├── types.ts            # 타입 정의 (Single Source of Truth)
├── types/              # 도메인 타입 (SemanticQuantityReference 등)
├── services/           # 비즈니스 로직 (buildings, projects, gantt 등)
├── supabase/           # Supabase 클라이언트 (client/server)
├── hooks/              # 커스텀 훅
├── utils/              # 유틸리티 (물량해석, 공정계산, logger 등)
└── data/               # 정적 데이터 (공정 모듈, 템플릿)
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

## Database

Supabase PostgreSQL. 스키마는 `sql/schema/` 참고.

| 기능 | 저장소 | 비고 |
|------|--------|------|
| 프로젝트/간트/게시판/사용자 | Supabase | 운영 중 |
| 동/층/물량 | localStorage | Supabase 이관 예정 |

## Workspace Commands

```bash
npm -w @contech/web run <script>    # web 앱
npm -w sa-gantt-lib run <script>    # gantt 라이브러리
npm run lint                        # 전체 lint
npm run clean                       # node_modules 정리
```

## Code Quality Status

기준일: `2026-02-10`

- `apps/web` 린트 상태: `errors: 0`, `warnings: 0`
- 검증 명령:

```bash
cd apps/web
npx eslint src
```

- 관련 진행 문서: `docs/refactoring_status.md`
