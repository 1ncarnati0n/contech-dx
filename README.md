# ConTech-DX

건축직영공사 공정관리 시스템 (Construction Technology Digital Transformation)

## Quick Start

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp apps/web/.env.example apps/web/.env.local
# .env.local에 Supabase URL, Anon Key, Gemini API Key 입력

# 3. 개발 서버 실행
npm run dev              # http://localhost:3000

# 4. 빌드 (라이브러리 수정 시)
npm run build:lib        # sa-gantt-lib 빌드
npm run build            # web 앱 빌드

# 5. 테스트
npm run test
```

> **빌드 순서**: 라이브러리 수정 시 반드시 `npm run build:lib` → `npm run build` 순서로 빌드

## Monorepo Structure

```
contech-dx/
├── apps/web/              # Next.js 16 웹 앱 (@contech/web)
├── packages/sa-gantt-lib/ # 간트차트 라이브러리
├── package.json           # npm workspaces
├── turbo.json             # Turborepo
└── vercel.json            # Vercel 배포
```

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, Turbopack, React Compiler) |
| Language | TypeScript 5 (Strict) |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Styling | Tailwind CSS 4 + Radix UI |
| AI | Google Gemini API |
| Gantt | sa-gantt-lib (자체 라이브러리) |
| 3D/BIM | @thatopen/components + Three.js |
| 2D Canvas | Konva (react-konva) |
| Form | React Hook Form + Zod |
| State | Zustand 5 + Immer |
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
Supabase 연동, 태스크/마일스톤 CRUD, 의존성 관리, 그룹 드래그, Undo/Redo, Excel 내보내기

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

Feature-based 아키텍처와 **View/Service/Repository 3-Layer 패턴**을 적용합니다.

```
src/
├── app/                          # Next.js App Router (thin pages)
│   ├── (auth)/                   #   인증 (login, signup, reset-password)
│   ├── (container)/              #   표준 레이아웃 (admin, posts, profile, projects)
│   │   └── projects/[id]/        #     프로젝트 상세 서브라우트 (17개 탭)
│   ├── (fullscreen)/             #   전체화면 (간트차트, 파일 검색)
│   └── api/                      #   API Routes (gemini, admin, users)
│
├── features/                     # 도메인별 기능 모듈
│   ├── admin/                    #   관리자 기능
│   ├── ai-chat/                  #   AI 챗봇 & 파일 검색
│   ├── auth/                     #   인증
│   ├── building/                 #   동 관리 (기본정보, 공정계획, 물량, 단가 등)
│   ├── castplan/                 #   콘크리트 타설 계획
│   ├── dashboard/                #   대시보드
│   ├── gantt/                    #   간트차트
│   ├── post/                     #   게시판
│   ├── profile/                  #   프로필
│   └── project/                  #   프로젝트 관리
│
└── shared/                       # 전역 공유 모듈
    ├── components/               #   공통 컴포넌트 (ui, layout, common)
    ├── hooks/                    #   공통 훅 (useAsyncData, useRealtimeCacheSync 등)
    ├── lib/                      #   인프라 (supabase, auth, permissions, schemas)
    ├── stores/                   #   Zustand 스토어
    ├── types/                    #   타입 정의
    └── utils/                    #   유틸리티
```

### Feature Module 내부 구조 (3-Layer)

각 feature 모듈은 관심사를 분리하여 향후 백엔드 마이그레이션에 대비합니다.

```
features/<domain>/
├── view/           # UI 렌더링 전용 (비즈니스 로직 없음)
├── service/        # 비즈니스 로직 + 상태 관리 훅 + 순수 함수
├── repository/     # Supabase CRUD (교체 대상)
├── data/           # 정적 데이터 (선택적)
└── types/          # 도메인 타입 (선택적)
```

| Layer | 역할 | 마이그레이션 시 |
|-------|------|---------------|
| **View** | UI 렌더링. Service 훅만 호출 | 변경 없음 |
| **Service** | 비즈니스 로직, 에러 처리, 데이터 변환 | 그대로 이전 |
| **Repository** | Supabase 직접 호출 | FastAPI 클라이언트로 교체 |

## Environment Variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

## Database

Supabase PostgreSQL. 스키마는 `sql/schema/` 참고.

| 기능 | 저장소 |
|------|--------|
| 프로젝트/간트/게시판/사용자 | Supabase |
| 동/층/층별 공종 데이터 | Supabase |
| 공정로직/공정계획 일부 상태 | localStorage + Supabase 혼재 |

## Workspace Commands

```bash
npm run dev                         # 개발 서버
npm run build:lib                   # sa-gantt-lib 빌드
npm run build                       # web 앱 빌드
npm run test                        # 테스트 실행
npm run lint                        # 전체 lint
npm -w @contech/web run <script>    # web 앱 개별 실행
npm -w sa-gantt-lib run <script>    # gantt 라이브러리 개별 실행
```

## Documentation

- [Architecture.md](./Architecture.md) — 시스템 아키텍처 상세 설명
- `docs/Sample/` — 샘플 데이터 파일
- `sql/` — DB 스키마, 마이그레이션, 시드
