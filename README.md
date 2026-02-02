# ConTech-DX

건축직영공사 공정관리 시스템 (Construction Technology Digital Transformation)

## Monorepo Structure

```
contech-dx/
├── apps/
│   └── web/                 # Next.js 16 웹 애플리케이션 (@contech/web)
├── packages/
│   └── sa-gantt-lib/        # 간트차트 라이브러리 (sa-gantt-lib)
├── package.json             # 루트 (npm workspaces)
├── turbo.json               # Turborepo 설정
└── vercel.json              # Vercel 배포 설정
```

**Package Manager**: npm (workspaces)

## Tech Stack

| 영역 | 기술 | 버전 |
|------|------|------|
| **Framework** | Next.js (App Router) | 16.x |
| **Language** | TypeScript (Strict Mode) | 5.x |
| **Database** | Supabase (PostgreSQL) | 2.80.0 |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | Radix UI + shadcn/ui | Latest |
| **Animation** | Framer Motion | 12.x |
| **Form** | React Hook Form + Zod | 7.x + 4.x |
| **AI** | Google Gemini API | 0.24.1 |
| **Gantt Chart** | sa-gantt-lib | 0.1.1 |
| **3D/BIM** | @thatopen/components, Three.js | Latest |
| **2D Canvas** | Konva (react-konva) | 10.2.0 |
| **Data Viz** | Recharts | 3.5.1 |
| **Testing** | Jest + React Testing Library | 29.x |
| **Caching** | TTL-based Memory Cache | Custom |

## Getting Started

```bash
# 의존성 설치 (모든 워크스페이스)
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드 (sa-gantt-lib → web 순서)
npm run build:lib    # sa-gantt-lib 빌드
npm run build        # web 앱 빌드

# 테스트 실행
npm run test

# 테스트 워치 모드 (web 앱)
npm -w @contech/web run test:watch

# 테스트 커버리지 (web 앱)
npm -w @contech/web run test:coverage

# 모든 node_modules 정리
npm run clean
```

### Workspace Commands

```bash
# 특정 워크스페이스에서 명령 실행
npm -w @contech/web run <script>     # web 앱
npm -w sa-gantt-lib run <script>     # gantt 라이브러리

# 모든 워크스페이스에서 lint 실행
npm run lint
```

## Project Structure

```
src/
├── __tests__/                    # 테스트 파일
│   ├── components/
│   └── utils/
│
├── app/                          # Next.js App Router
│   ├── (container)/              # Route Group (메인 레이아웃)
│   │   ├── admin/                # 관리자 페이지 (users, promote)
│   │   ├── posts/                # 게시판 (CRUD)
│   │   ├── profile/              # 사용자 프로필
│   │   ├── projects/             # 프로젝트 관리
│   │   │   └── [id]/             # 프로젝트 상세
│   │   └── layout.tsx
│   ├── (fullscreen)/             # 전체화면 레이아웃
│   │   └── projects/[id]/gantt/  # 간트차트 전체화면
│   ├── api/                      # API Routes
│   │   ├── gemini/               # Gemini AI API (process-plan-chat)
│   │   └── users/                # 사용자 관리 API
│   ├── auth/callback/            # Supabase Auth Callback
│   ├── file-search/              # AI 파일 검색
│   ├── home/                     # 대시보드
│   ├── login/                    # 로그인
│   ├── signup/                   # 회원가입
│   └── page.tsx                  # 랜딩 페이지
│
├── components/
│   ├── ui/                       # 디자인 시스템 (15개)
│   │   ├── Button, Card, Dialog, Form, Input
│   │   ├── Badge, Skeleton, Spinner, Tooltip
│   │   └── LoadingBar, Toaster...
│   ├── auth/                     # 인증 (LoginForm, SignupForm, LogoutButton)
│   ├── buildings/                # 동/층 관리 (24개 컴포넌트)
│   │   ├── BuildingBasicInfoPage.tsx    # 동 기본정보 입력
│   │   ├── QuantityInputPage.tsx        # 물량 입력
│   │   ├── BuildingProcessPlanPage.tsx  # 공정계획 수립
│   │   ├── BasementProcessPlanPage.tsx  # 지하층 공정계획
│   │   ├── ProcessPlanChatbotSidebar.tsx # AI 공정계획 챗봇
│   │   ├── DetailedFloorTradeTable.tsx  # 상세 물량 테이블
│   │   └── ...
│   ├── castplan/                 # 콘크리트 타설 계획
│   │   ├── CastPlanCanvas.tsx    # Konva 캔버스
│   │   ├── DxfUploader.tsx       # DXF 파일 업로드
│   │   ├── layers/               # 레이어 (DXF, Block, Gate, PumpCar)
│   │   └── panels/               # 패널 (BlockProperties, VolumeCalculation)
│   ├── ifc-viewer/               # BIM/IFC 3D 뷰어
│   │   └── IfcViewer.tsx         # @thatopen/components 기반
│   ├── file-search/              # AI 파일 검색
│   │   ├── ChatArea.tsx          # 채팅 인터페이스
│   │   ├── Sidebar.tsx           # 문서함 사이드바
│   │   └── Notification.tsx
│   ├── projects/                 # 프로젝트 관리
│   │   ├── ProjectDetailClient.tsx
│   │   ├── GanttChartPage.tsx    # 간트차트 요약 페이지
│   │   ├── FullscreenGanttPage.tsx # 전체화면 간트차트
│   │   ├── ProjectTeamPage.tsx   # 팀 관리
│   │   └── ProjectCard, ProjectList, ProjectCreateModal...
│   ├── dashboard/                # 대시보드
│   │   ├── ConstructionDashboard.tsx
│   │   ├── KPICards.tsx          # 진행률 카드
│   │   ├── TaktView.tsx          # Takt 뷰
│   │   ├── BuildingProgress.tsx  # 동별 진행률
│   │   └── CCTVSection.tsx       # CCTV 섹션
│   ├── posts/                    # 게시판
│   ├── comments/                 # 댓글
│   ├── layout/                   # 레이아웃 (NavBar, ThemeToggle, ThemeProvider)
│   ├── common/                   # 공통 (ConfirmDialog, MarkdownRenderer, PageHeader)
│   └── home/                     # 홈 (LandingPage)
│
├── lib/
│   ├── types.ts                  # 타입 정의 (Single Source of Truth)
│   ├── constants.ts              # 상수 정의
│   ├── utils.ts                  # cn() 등 기본 유틸
│   ├── utils/                    # 유틸리티 모듈
│   │   ├── formatters.ts         # 날짜, 통화 포맷팅
│   │   ├── project-status.ts     # 프로젝트 상태 색상/라벨
│   │   ├── logger.ts             # 환경별 로깅
│   │   └── index.ts
│   ├── hooks/                    # 커스텀 훅
│   │   ├── useAsyncData.ts       # 비동기 데이터 훅
│   │   ├── useTabDragDrop.ts     # 탭 드래그앤드롭
│   │   └── index.ts
│   ├── supabase/                 # Supabase 클라이언트
│   │   ├── client.ts             # 클라이언트 사이드
│   │   └── server.ts             # 서버 사이드
│   ├── services/                 # 비즈니스 로직 레이어
│   │   ├── buildings.ts          # 동/층 관리 (1000+ 라인)
│   │   ├── mockStorage.ts        # localStorage 추상화
│   │   ├── SupabaseGanttDataService.ts # 간트차트 Supabase 연동
│   │   ├── process-plan-chatbot.ts # AI 공정계획 챗봇 서비스
│   │   ├── projects.ts           # 프로젝트 CRUD
│   │   ├── projectMembers.ts     # 프로젝트 멤버 관리
│   │   ├── posts.client.ts       # 게시글 (클라이언트)
│   │   ├── comments.client.ts    # 댓글 (클라이언트)
│   │   ├── users.client.ts       # 사용자 관리
│   │   ├── gemini.ts             # Gemini AI 서비스
│   │   ├── unitRates.ts          # 단가 데이터
│   │   └── cache.ts              # TTL 기반 캐싱
│   ├── data/                     # 정적 데이터
│   │   └── process-modules.ts    # 공정 템플릿 데이터
│   └── permissions/              # 권한 관리
│       └── server.ts
│
├── styles/
│   └── globals.css               # 글로벌 스타일 + CSS 변수
│
└── types/                        # 추가 타입 정의
```

## Key Features

### 1. 동(Building) 관리 시스템 ✅
- **동 기본정보 입력**: 동 생성, 층수/코어 설정, 층고 관리
- **층 자동 생성**: 지하층, 지상층, 옥탑층 자동 생성 및 분류
- **물량 입력**: 동별/층별/공종별 물량 데이터 관리
- **FloorTrade 보존**: 층 재생성 시 기존 물량 데이터 유지

### 2. 공정계획 시스템 ✅
- **공정계획 수립**: 일수고정/물량기반/장비기반 계산 방식
- **지상층/지하층 공정**: 개별 공정 계획 수립
- **AI 챗봇 어시스턴트**: Gemini API 기반 공정계획 질의응답
- **공정 템플릿**: 12가지 건물 유형별 표준 공정 데이터

### 3. 간트차트 (sa-gantt-lib) ✅
- **Supabase 연동**: 실시간 데이터 동기화
- **태스크/마일스톤 관리**: CRUD 완전 지원
- **의존성 관리**: 앵커 기반 종속성 연결
- **그룹 드래그**: CP 단위 일괄 이동
- **Undo/Redo**: 히스토리 기반 실행취소
- **Import/Export**: JSON, Excel 지원

### 4. BIM/IFC 3D 뷰어 ✅
- **@thatopen/components**: OpenBIM 표준 뷰어
- **IFC 파일 로드**: 드래그앤드롭 지원
- **요소 선택**: Ctrl+클릭 다중 선택
- **속성 패널**: 선택 요소 속성 표시
- **뷰 프리셋**: 상/하/전/후/좌/우 뷰
- **투영 모드**: 원근/정사영 전환

### 5. 콘크리트 타설 계획 ✅
- **DXF 업로드**: 도면 파일 시각화
- **블록 관리**: 타설 블록 생성/편집
- **펌프카 배치**: 도달 범위 시각화
- **게이트 관리**: 출입구 배치
- **물량 계산**: 블록별 콘크리트 물량

### 6. AI 파일 검색 ✅
- **Gemini API 연동**: RAG 기반 문서 검색
- **스토어 관리**: 문서함 생성/삭제
- **파일 업로드**: 다중 파일 지원
- **출처 인용**: 답변에 출처 표시

### 7. 프로젝트 관리 ✅
- **프로젝트 CRUD**: 생성, 조회, 수정, 삭제
- **상태 관리**: 공모 → 입찰 → 수주 → 착공 → 준공
- **팀 멤버 관리**: PM, Engineer, Supervisor, Worker
- **권한 기반 접근**: 역할별 기능 제한

### 8. 대시보드 ✅
- **KPI 카드**: 골조 공사 진행률, 인원투입 차트
- **금일 인원투입현황**: 물량 기반 동적 계산 (갱폼/알폼/형틀/철근/타설)
- **Takt 뷰**: 공정 타임라인
- **동별 진행률**: 동별 공사 현황
- **CCTV 섹션**: 현장 모니터링

### 9. 인증 및 권한 ✅
- **Supabase Auth**: 이메일/비밀번호 인증
- **4단계 역할 시스템**: admin, main_user, vip_user, user
- **서버사이드 권한 체크**: 페이지별 접근 제어

### 10. 게시판/댓글 ✅
- **게시글 CRUD**: 작성, 조회, 수정, 삭제
- **마크다운 지원**: ReactMarkdown 렌더링
- **댓글 시스템**: 중첩 댓글

## Architecture

### 데이터 저장소
| 기능 | 저장소 | 상태 |
|------|--------|------|
| 프로젝트 | Supabase | ✅ |
| 간트 차트 | Supabase | ✅ |
| 동/층/물량 | localStorage (mockStorage) | ⚠️ 이관 필요 |
| 게시판/댓글 | Supabase | ✅ |
| 사용자 | Supabase Auth | ✅ |

### 캐싱 전략
- **TTL 기반 메모리 캐시** (`src/lib/services/cache.ts`)
- 기본 TTL: 5분, 짧은 TTL: 1분, 긴 TTL: 15분
- CRUD 작업 시 자동 캐시 무효화

### 폼 처리 패턴
- **React Hook Form + Zod** 통일
- 서버 사이드 유효성 검증
- Toast 기반 에러/성공 메시지

### 에러 처리 패턴
- 표준 API 응답: `ApiResponse<T>` 타입
- 클라이언트: `toast.success()` / `toast.error()`
- 서버: `logger` 유틸리티 사용

## Development Status

### 완료 (Production Ready) ✅
- 동/층 관리 시스템
- 물량 입력
- 공정계획 수립
- 간트차트 (Supabase 연동)
- IFC 3D 뷰어
- 콘크리트 타설 계획
- AI 파일 검색
- 인증/권한 시스템
- 게시판/댓글
- 대시보드 인원투입 계산 (물량 기반)

### 진행 중 🔄
- 동/층 데이터 Supabase 이관

### 계획됨 ⏳
- 실시간 협업 (Realtime)
- 모바일 반응형 최적화
- 가격 산정 모듈
- 지질 데이터 입력

## Import 규칙

```typescript
// 유틸리티 함수
import { formatCurrency, formatDate, logger } from '@/lib/utils/index';
import { getStatusLabel, getStatusColors } from '@/lib/utils/index';

// 서버 컴포넌트에서 권한 체크
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';

// 타입 import
import type { Project, Profile, UserRole, Building, Floor } from '@/lib/types';

// UI 컴포넌트
import { Button, Card, Dialog, Input } from '@/components/ui';

// 서비스 레이어
import { getBuildings, createBuilding } from '@/lib/services/buildings';
import { createSupabaseGanttDataService } from '@/lib/services/SupabaseGanttDataService';

// 커스텀 훅
import { useAsyncData, useTabDragDrop } from '@/lib/hooks';
```

## 사용자 역할

| Role | 레벨 | 설명 |
|------|------|------|
| `admin` | 4 | 시스템 관리자 - 전체 관리 권한 |
| `main_user` | 3 | 주요 사용자 - 프로젝트 생성/관리 |
| `vip_user` | 2 | VIP 사용자 - 확장 기능 접근 |
| `user` | 1 | 일반 사용자 - 기본 기능 |

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

## Database

Supabase PostgreSQL 기반 데이터베이스

- SQL 스키마: `sql/schema/`
  - `schema-roles.sql` - 사용자 프로필 및 역할
  - `schema-projects.sql` - 프로젝트 및 팀 멤버
  - `schema-gantt.sql` - 간트차트 테이블
- 마이그레이션: `sql/migrations/`
- 샘플 데이터: `sql/seeds/`


## Documentation

프로젝트 문서: `docs/` 폴더
- `StandardProcess_Input_Data.md` - 12가지 건물 유형별 표준 공정 템플릿
- `buildings_input-infos.md` - 동/층 데이터 입력 시스템 문서

## Known Issues

### localStorage 제한
동/층 데이터가 localStorage에 저장되어 있어 대규모 프로젝트에서 5-10MB 제한에 도달할 수 있음. Supabase 이관 필요.

### ~~간트 차트 그룹 드래그~~ ✅ 해결됨
`countWorkingDays()`와 `addWorkingDays()`의 off-by-one 문제는 `moveByWorkingDays()` 함수로 해결됨. `useGroupDrag.ts`에서 `calculateGroupTasksMoveWithCriticalPath`가 올바르게 처리함.

### ~~디버그 로깅 코드~~ ✅ 제거됨 (2025-01-27)
`quantity-reference.ts` 및 `BuildingProcessPlanPage.tsx`의 디버그 fetch 코드 완전 제거.

### ~~대시보드 인원투입 계산~~ ✅ 활성화됨 (2025-01-27)
`DailyWorkerInputDashboard.tsx`에서 `calculatedWorkerCounts` 동적 계산값 사용 중.

## TODO

| 파일 | 내용 | 상태 |
|------|------|------|
| `src/lib/constants.ts:13` | `@todo gemini.ts 서비스에서 활용 고려` | 대기 |
| `src/lib/services/buildings.ts` | Supabase 이관 필요 | 대기 |
| `sql/schema/schema-buildings.sql` | buildings/floors/floor_trades 스키마 작성 | 계획됨 |

### 완료됨 ✅
| 파일 | 내용 | 완료일 |
|------|------|--------|
| `src/lib/utils/quantity-reference.ts` | 디버그 로깅 코드 제거 (7개 블록) | 2025-01-27 |
| `src/components/buildings/BuildingProcessPlanPage.tsx` | 디버그 로깅 코드 제거 (2개 블록) | 2025-01-27 |
| `src/components/dashboard/DailyWorkerInputDashboard.tsx` | 계산 로직 활성화 | 2025-01-27 |

## Changelog

### 2025-02-02
#### Fixed
- **프로젝트 멤버 권한 체크 버그 수정**: 프로젝트 번호(숫자)와 UUID 형식 불일치로 인한 접근 거부 문제 해결
  - `lib/auth/requireProjectMember.ts`: 프로젝트 번호 → UUID 변환 로직 추가
  - `isUUID()`: UUID v4 형식 검증 함수 추가
  - `isProjectNumber()`: 순수 숫자 문자열 검증 함수 추가
  - URL `/projects/1` (프로젝트 번호) 접근 시 `projects` 테이블에서 UUID 조회 후 멤버십 체크

#### Added
- **그룹 종속선 클러스터 동시 이동**: 그룹 간 종속선(FS)이 연결되면 어느 한 그룹을 드래그해도 연결된 모든 그룹과 하위 태스크가 함께 이동
  - `useGroupDrag.ts`: `groupDependencies` 옵션 추가, 드래그 시작 시 `collectConnectedGroupCluster()`로 연결된 그룹 클러스터 전체 수집
  - `useTimelineCore.ts`: `useGroupDrag` 훅에 `groupDependencies` 전달
  - 기존 `dependencyGraph.ts`의 `buildGroupDependencyGraph()`, `collectConnectedGroupCluster()` 함수 활용
- **관리자 권한 예외 처리**: `requireProjectMember()`에 관리자(admin) 예외 로직 추가
  - `lib/auth/requireProjectMember.ts`: `isSystemAdmin()` 체크로 admin 역할 사용자는 모든 프로젝트 접근 가능
  - Early Return 패턴으로 관리자 접근 시 불필요한 DB 쿼리 방지
- **비멤버 접근 시 안내 메시지**: 프로젝트 멤버가 아닌 사용자 접근 시 toast 알림 표시
  - `ProjectList.tsx`: URL 파라미터(`?access=denied`) 감지 후 경고 메시지 표시
  - "프로젝트 접근 권한이 없습니다. 관리자에게 멤버 등록을 요청해주세요." 안내

### 2025-01-28
#### Changed
- **pnpm → npm 마이그레이션**: Vercel 배포 호환성을 위해 패키지 매니저를 npm workspaces로 전환
  - `pnpm-workspace.yaml`, `pnpm-lock.yaml` 삭제
  - `package-lock.json` 생성
  - 루트 `package.json` 스크립트를 npm workspace 문법으로 변환
  - `apps/web/package.json`에서 `workspace:*` → `*` 변경
  - `@thatopen/fragments` 의존성 명시적 추가 (peer dependency 해결)

#### Fixed
- **Vercel 빌드 실패 수정**: `sa-gantt-lib`를 web 앱보다 먼저 빌드하도록 `vercel.json` 수정
  - `buildCommand`: `npm run build:lib && npm run build`

### 2025-01-27
#### Fixed
- **디버그 로깅 코드 제거**: `quantity-reference.ts`(7개), `BuildingProcessPlanPage.tsx`(2개)에서 외부 서버(`127.0.0.1:7242`)로의 HTTP fetch 코드 완전 제거
- **대시보드 인원투입 계산 활성화**: `DailyWorkerInputDashboard.tsx`에서 고정값 대신 `calculatedWorkerCounts` 동적 계산값 사용

#### Verified
- **간트 차트 그룹 드래그**: `moveByWorkingDays()` 함수가 이미 off-by-one 문제를 해결하고 있음 확인. `calculateGroupTasksMoveWithCriticalPath`가 올바르게 동작 중