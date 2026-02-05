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
│   ├── ui/                       # 디자인 시스템 (16개)
│   │   ├── Button, Card, Dialog, Form, Input
│   │   ├── Badge, Skeleton, Spinner, Tooltip
│   │   ├── CollapsibleSection (NEW)
│   │   └── LoadingBar, Toaster...
│   ├── auth/                     # 인증 (LoginForm, SignupForm, LogoutButton)
│   ├── buildings/                # 동/층 관리 (29개 컴포넌트)
│   │   ├── BuildingBasicInfoPage.tsx    # 동 기본정보 입력
│   │   ├── QuantityInputPage.tsx        # 물량 입력
│   │   ├── BuildingProcessPlanPage.tsx  # 공정계획 수립 (2,275줄)
│   │   ├── BasementProcessPlanPage.tsx  # 지하층 공정계획
│   │   ├── ProcessPlanChatbotSidebar.tsx # AI 공정계획 챗봇
│   │   ├── DetailedFloorTradeTable.tsx  # 상세 물량 테이블
│   │   ├── process-plan/                # 세부공정 컴포넌트 (NEW)
│   │   │   ├── ProcessDetailPanel.tsx   # 세부공정 상세 패널
│   │   │   ├── ProcessItemCard.tsx      # 개별 세부공종 카드
│   │   │   ├── FormulaDisplay.tsx       # 산식 표시 컴포넌트
│   │   │   └── hooks/useProcessCalculation.ts # 계산 훅
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
- **공정로직 관리**: 계산 공식, 공정 모듈, 사이클 정의 대시보드
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
- **IFC 파일 로드**: 드래그앤드롭, 파일 선택, 샘플 파일 지원
- **요소 선택**: Ctrl+클릭 다중 선택
- **속성 패널**: 선택 요소 속성 표시
- **6방향 뷰 컨트롤**: 상/하/전/후/좌/우 뷰 전환
- **투영 모드**: 원근/정사영 전환
- **카메라 컨트롤**: 리셋, fitToModel 기능
- **단일 파일 구조**: 안정성 우선, 향후 점진적 최적화 예정

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

### 성능 최적화 ⚡

#### 프로덕션 성능 최적화 (완료)
**Day 1-4 완료** (2026-02-05)

- ✅ **Day 1 - Serial Queries 최적화**: 캐싱된 함수 사용으로 350ms 개선
- ✅ **Day 2 - Overview 탭 최적화**: 데이터 필터링으로 400ms 개선 (70-90% 크기 감소)
- ✅ **Day 3 - localStorage Throttling**: 빈번한 저장 방지로 30ms 개선
- ✅ **Day 4 - 클라이언트 사이드 탭 전환**: 서버 요청 제거로 **500ms 개선** ⚡
- **누적 개선**: 1,280-1,880ms (이전 최적화 포함)

**이전 최적화**:
- React Compiler 활성화 (200-400ms)
- Lazy Loading 수정 (500-800ms)
- getProject 캐싱 (100-200ms)

📖 **상세 문서**: `PERFORMANCE_OPTIMIZATION_REPORT.md`

---

#### IFC 3D 뷰어 - 안정성 우선 복원 (2026-02-04)

- **단순화 복원**: 복잡한 최적화 구조(29개 파일)를 작동하는 단순한 버전(2개 파일)으로 복원
- **안정성 확보**: 모든 기본 기능이 작동하는 검증된 베이스라인 확보
- **향후 계획**: 안정적인 베이스 위에서 점진적 최적화 재시도 예정
  - Phase 1: 메모리 누수 수정, React.memo 적용 (작은 변경으로 50% 개선 가능)
  - Phase 3: Singleton 패턴 (신중한 테스트 후 적용)
  - Phase 2: 컴포넌트 분할 (효과 대비 복잡도 증가로 우선순위 낮음)

📖 **최적화 시도 문서**: `docs/IFC_VIEWER_OPTIMIZATION_ATTEMPT.md` (참고용 보관)

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
- 프로젝트 탭 전환 성능 개선
  - ✅ Stage 1 완료: 3000ms → 2000ms (33% 개선) - 2026-02-04
  - ✅ Stage 2 완료: 2000ms → ~900ms (67% 누적 개선) - 2026-02-04
  - 📋 Stage 3 계획: 900ms → 100ms (97% 최종 목표)
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
- `PERFORMANCE_IMPROVEMENTS.md` - 프로젝트 탭 전환 성능 최적화 문서 (Stage 2 진행중)

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

### 2026-02-05
#### Performance
- **프로덕션 성능 최적화 완료** (Day 1-4): 1,280ms 개선 (누적 1,480-2,080ms) ⚡
  - **Day 1 - Serial Queries 최적화** (350ms): `requireProjectMember.ts`에서 2번의 순차 쿼리를 캐싱된 함수(`getProject`, `isProjectMember`)로 대체
    - 첫 요청: 400ms (캐시 미스)
    - 두 번째 요청: 50ms (캐시 히트) ✅ 87.5% 개선
  - **Day 2 - Overview 탭 최적화** (400ms): 새 함수 `getBuildingsForOverview()` 추가
    - 5개 공종(gangForm, alForm, formwork, rebar, concrete)만 필터링
    - 데이터 크기: 1MB+ → 50-100KB (70-90% 감소)
    - 로드 시간: 500ms → 100ms ✅ 80% 개선
  - **Day 3 - localStorage Throttling** (30ms): `BasementProcessPlanPage.tsx`에서 4곳의 저장 로직에 throttle 적용
    - es-toolkit의 `throttle()` 사용 (500ms 간격)
    - 빈번한 저장으로 인한 메인 스레드 블로킹 방지
  - **Day 4 - 클라이언트 사이드 탭 전환** (500ms): 서버 요청 완전 제거 ⚡
    - **근본 원인**: `router.replace()`가 서버 RSC payload 요청을 트리거 (350-800ms 지연)
    - **해결 방법**: `window.history.replaceState()`로 순수 클라이언트 URL 업데이트
    - **개선 효과**: 탭 전환 시간 **500ms → 0-50ms** (95% 개선!)
    - **변경 파일**:
      - `ProjectDetailClient.tsx` (Line 169-211): `handleTabChange` 함수 최적화
      - 의존성 배열: `[searchParams, router]` → `[]` (순수 클라이언트 동작)
      - `popstate` 이벤트 리스닝으로 브라우저 뒤로가기/앞으로가기 지원
    - **유지되는 기능**:
      - ✅ URL 공유 가능
      - ✅ 페이지 새로고침 시 탭 상태 유지
      - ✅ 브라우저 히스토리 정상 동작
    - **사용자 체감**: "즉각 반응" (빈 프로젝트도 동일)
  - **빌드 검증**: TypeScript 컴파일 성공 ✅
  - **최종 결과**: 탭 전환 대기 시간 대폭 감소, 사용자 경험 획기적 개선

#### Refactored
- **apps/web 리팩토링 완료**: 중복 코드 제거 및 타입 안전성 개선
  - **Phase 1 - 중복 파일 통합**: `BuildingBasicInfo.tsx` (1,314줄) 제거, `BuildingBasicInfoRefactored.tsx`를 표준으로 채택
    - 561줄 코드 감소 (43% 개선)
    - import 경로 통일 (`BuildingBasicInfoPage.tsx`, `index.ts`)
  - **Phase 2 - ProcessLogicPage 타입 안전성**: 프리셋 모듈 검증 로직 추가
    - `isProcessModule()`, `isProcessModuleArray()` 타입 가드 함수 추가 (`lib/types.ts`)
    - `as any` 제거, 런타임 검증으로 대체 (`ProcessLogicPage.tsx:169`)
    - 잘못된 프리셋 데이터 시 사용자 친화적 에러 토스트 표시
  - **Phase 3 - BuildingBasicInfo 타입 안전성**: DTO 인터페이스 확장
    - `UpdateBuildingDTO`에 `forceRegenerateFloors?: boolean` 필드 추가 (`lib/types.ts:606`)
    - `buildings.ts:676`, `BuildingBasicInfo.tsx:516`에서 `as any` 제거
  - **최종 결과**:
    - ✅ 코드 중복 제거: 561줄 감소
    - ✅ 타입 안전성: `as any` 3곳 완전 제거
    - ✅ 빌드 검증: TypeScript 컴파일 성공
    - ✅ 런타임 안정성: 타입 가드로 데이터 유효성 검증

#### Added
- `getBuildingsForOverview()` 함수 (`lib/services/buildings.ts`): Overview 전용 경량 데이터 조회
- `saveToLocalStorageThrottled()` 유틸리티 (`components/buildings/BasementProcessPlanPage.tsx`): throttle 기반 localStorage 저장

#### Changed
- `requireProjectMember()` (`lib/auth/requireProjectMember.ts`): 직접 쿼리 → 캐싱된 함수 사용
- `DailyWorkerInputDashboard.tsx`: `getBuildings()` → `getBuildingsForOverview()` 사용
- `BasementProcessPlanPage.tsx`: 4곳의 `localStorage.setItem()` → `saveToLocalStorageThrottled()` 교체
- **탭 전환 최적화** (`ProjectDetailClient.tsx`):
  - `handleTabChange()`: `router.replace()` → `window.history.replaceState()` (서버 요청 제거)
  - 의존성 배열: `[searchParams, router]` → `[]` (순수 클라이언트 동작)
  - 브라우저 뒤로가기/앞으로가기: `searchParams` 감시 → `popstate` 이벤트 리스닝

### 2026-02-04
#### Changed
- **IFC 3D 뷰어 복원**: 작동하는 단순한 버전(커밋 6ff0958)으로 복원
  - **복원 배경**: 성능 최적화 시도 중 복잡한 구조(29개 파일)로 분할하면서 기능이 작동하지 않게 됨
  - **복원 내용**: 작동하는 단일 파일 버전(745줄)으로 완전 복원
  - **복원 결과**:
    - ✅ 모든 기본 기능 작동 (IFC 로드, 6방향 뷰, 프로젝션 토글, 선택, 속성 패널)
    - ⚠️ 탭 전환 시간: 2.5-3.0초 (최적화 전 상태로 복귀)
    - ✅ 안정성 우선, 이해하기 쉬운 코드베이스 확보
  - **구조 단순화**:
    - Before: 29개 파일 (Context, Store, Hooks, Components 분산)
    - After: 2개 파일 (IfcViewer.tsx, index.ts)
  - **향후 계획**: 안정적인 베이스라인에서 점진적 최적화 재시도 예정
  - **백업**: `backup/ifc-viewer-optimized-2026-02-04` 브랜치에 최적화 시도 코드 보관

#### Added
- **최적화 시도 문서 보관**: `docs/IFC_VIEWER_OPTIMIZATION_ATTEMPT.md`
  - 성능 최적화 시도 과정 기록 (Phase 1-3)
  - 향후 최적화 재시도 시 참고용

#### Fixed
- **IFC 뷰어 기능 복구**:
  - ViewControls (6방향 뷰) UI 복원
  - 프로젝션 토글 버튼 복원
  - resetCamera(), fitToModel() 메서드 복원
  - 모든 이벤트 리스너 및 정리 로직 복원

### 2025-02-04
#### Added
- **공정모듈 계산 로직 시각화** (`ProcessModuleSection.tsx`): 각 공정 항목의 계산 방식을 색상과 아이콘으로 구분하여 직관적으로 표시
  - **계산 방식 뱃지**: 3가지 방식을 색상으로 구분 표시
    - 🔒 일수고정 (파란색): 순작업일이 고정값인 항목
    - 🧮 물량계산 (초록색): 수량을 인당생산성으로 나누어 계산하는 항목
    - 🚛 장비기반 (주황색): 장비대수와 대당 타설량 기반으로 계산하는 항목
  - **물량 참조 뱃지**: 물량입력표 참조 출처를 명확히 표시 (예: "D6 참조")
    - hover 시 상세 설명 표시 (예: "물량입력표 D6 (버림 형틀)")
  - **계산 단계 툴팁**: Info 아이콘 hover 시 단계별 계산 공식 표시
    - 고정값 방식: 3단계 (순작업일 → 총투입인원 → 1일투입인원)
    - 장비기반 방식: 4단계 (장비대수 → 1일투입인원 → 순작업일 → 총투입인원)
    - 물량계산 방식: 3단계 (총투입인원 → 1일투입인원 → 순작업일)
  - **헬퍼 함수 추가**:
    - `getCalculationMethod()`: 계산 방식 자동 판별
    - `getCalculationMethodConfig()`: 뱃지 색상/아이콘 설정
    - `getCalculationSteps()`: 계산 단계 텍스트 생성
    - `getQuantityReferenceLabel()`: 물량 참조 표시 변환 (예: `*` → `×`)
    - `getQuantityReferenceDescription()`: 물량 참조 상세 설명 생성
  - **사용자 경험 개선**: 한눈에 계산 방식 파악 가능, 공정 로직 학습 지원

#### Changed
- **공정계획 메뉴 순서 변경** (`ProjectSidebar.tsx`): 지하층 공정계획을 지상층 공정계획보다 위로 이동
  - 변경 전: 공정로직 → 지상층 공정계획 → 지하층 공정계획 → 간트차트
  - 변경 후: 공정로직 → **지하층 공정계획** → **지상층 공정계획** → 간트차트
  - **목적**: 실제 건설 공정 순서(지하층 → 지상층)와 일치하도록 메뉴 순서를 직관적으로 개선
  - **영향 범위**: 사이드바 표시 순서만 변경, 모든 기능은 ID 기반 라우팅으로 동작하므로 영향 없음
- **사이드바 UX 개선** (`ProjectSidebar.tsx`): 모든 서브메뉴를 디폴트로 펼친 상태로 시작
  - "데이터 입력"과 "공정계획" 서브메뉴가 페이지 로드 시 항상 펼쳐진 상태로 표시
  - 사용자가 수동으로 접기/펼치기는 여전히 가능
  - **목적**: 메뉴 구조 가시성 향상, 네비게이션 효율성 증대, 추가 클릭 감소

### 2025-02-03
#### Fixed
- **타입 변환 버그 수정** (`ProcessModuleSection.tsx:69`): 빈 문자열(`''`)이 `Number('')` = `0`으로 변환되던 버그 수정
  - 변경 전: `isNaN(Number(value)) ? value : Number(value)`
  - 변경 후: 빈 문자열일 경우 `null` 반환하여 의도치 않은 0 저장 방지

#### Changed
- **미사용 props 제거** (Dead Code 정리):
  - `FormulaSection.tsx`: `isEditing` prop 및 interface 제거
  - `CycleDefinitionSection.tsx`: `isEditing` prop 및 interface 제거
  - `ProcessLogicPage.tsx`: 위 컴포넌트에 전달하던 `isEditing` prop 제거
- **아이콘 통일** (`ProcessModuleSection.tsx`): `Edit2` → `Edit` 아이콘으로 통일 (편집 의미 일관성)
- **UX 개선** (`ProcessLogicPage.tsx`): `window.confirm()` → `ConfirmDialog` 컴포넌트로 교체
  - 앱 디자인과 일관된 커스텀 확인 다이얼로그 사용
  - 변경 취소, 기본값 초기화 시 적용

#### Added
- **공정로직 탭** (`ProcessLogicPage.tsx`): 공정계획 메뉴의 첫 번째 탭으로 추가
  - **계산 공식 섹션** (`FormulaSection.tsx`): 공정 일수 산출 공식 표시
    - 총작업인원, 장비대수, 1일투입인원, 순작업일수, 총작업일수 공식
    - 변수 설명 및 예제 표시
    - 부위별 대당 타설량 기준표 (버림/기초/지하층/셋팅층/기준층/PH층)
  - **공정 모듈 섹션** (`ProcessModuleSection.tsx`): 구분별 세부공정 항목 편집
    - 카테고리별 탭 (버림/기초/지하층/셋팅층/기준층/옥탑층)
    - 인라인 테이블 편집 (인당생산성, 순작업일, 간접일 등)
    - 기본값 초기화 기능
  - **사이클 정의 섹션** (`CycleDefinitionSection.tsx`): 5일/6일/7일/8일 사이클 비교
    - 사이클별 적용 가능 층 표시 (셋팅층/기준층/PH층)
    - 선택 사이클 상세 일정 표시
    - 사이클 선택 가이드
  - **상태 관리 훅** (`useProcessLogicState.ts`): 편집/저장/리셋 기능
    - localStorage 기반 프로젝트별 설정 저장
    - 변경사항 추적 및 취소 기능
  - **컴포넌트 구조**:
    ```
    components/buildings/
    ├── ProcessLogicPage.tsx              # 메인 페이지
    └── process-logic/
        ├── FormulaSection.tsx            # 계산 공식 섹션
        ├── ProcessModuleSection.tsx      # 공정 모듈 섹션
        ├── CycleDefinitionSection.tsx    # 사이클 정의 섹션
        ├── hooks/
        │   └── useProcessLogicState.ts   # 상태 관리 훅
        └── index.ts                      # 배럴 export
    ```

#### Changed
- **단위세대 호수 입력 방식 개선** (`UnitTypePattern` 인터페이스)
  - 기존: "시작 호수 ~ 끝 호수" 형식 (예: 1~2호)
  - 변경: "호수" 단일 입력 방식 (예: 2호 → 한층당 2세대)
  - **타입 변경** (`types.ts`):
    - `unitCount: number` 필드 추가 (한층당 세대수)
    - `from`/`to` 필드를 optional로 변경 (기존 데이터 호환성)
  - **UI 변경** (`UnitTypePatternSection.tsx`, `BuildingBasicInfo.tsx`):
    - 2개 입력 필드 → 1개 입력 필드로 단순화
  - **계산 로직** (`useBuildingAutoCalculations.ts`):
    - `unitCount` 우선 사용, 없으면 `to - from + 1`로 fallback
  - **표시 문자열** (`BuildingProcessPlanPage.tsx`, `BasementProcessPlanPage.tsx`):
    - `코어1 1~2호 59A` → `코어1 2호 59A` 형태로 변경

#### Refactored
- **동별 공정계획탭 UI 개선** (`BuildingProcessPlanPage.tsx`)
  - 2,886줄 → 2,275줄로 611줄 감소 (약 21% 코드 축소)
  - 인라인 세부공정 렌더링 코드를 `ProcessDetailPanel` 컴포넌트로 분리
  - `handleItemDirectWorkDaysChange` 핸들러 함수 추출로 순작업일 변경 로직 재사용 가능
  - **세부공정 컴포넌트 구조**:
    ```
    components/buildings/process-plan/
    ├── ProcessDetailPanel.tsx       # 세부공정 상세 패널 컨테이너
    ├── ProcessItemCard.tsx          # 개별 세부공종 카드 (번호 + 산식)
    ├── FormulaDisplay.tsx           # 재사용 가능한 산식 표시 컴포넌트
    ├── hooks/
    │   └── useProcessCalculation.ts # 계산 로직 + 산식 메타데이터
    └── index.ts                     # 배럴 export
    ```
  - **UI 개선 사항**:
    - 세부공정 항목에 #1, #2, #3... 순번 배지 표시
    - 각 항목에 "계산 과정" 토글 버튼 (기본 접힘)
    - 물량 데이터 출처 표시 (`← 물량입력표 D6 (형틀)` 형태)
    - 단계별 산식 시각화 (수량 참조 → 계산 → 결과)

- **빌딩 기본정보 UI 전면 개선** (`BuildingBasicInfoRefactored.tsx`)
  - 1,328줄 컴포넌트를 Compound Component 패턴으로 리팩토링
  - `CollapsibleSection` UI 컴포넌트 신규 생성 (접이식 섹션, 애니메이션 지원)
  - 3개 섹션 컴포넌트 분리:
    - `StructureInfoSection`: 구조 정보 (코어 수, 코어 타입, 슬래브 타입)
    - `UnitTypePatternSection`: 단위세대 구성 (패턴 추가/삭제, 층수 설정, 필로티 설정)
    - `FloorHeightSection`: 층고 설정 (지하/지상/옥탑층 층고)
  - `useBuildingAutoCalculations` 커스텀 훅 추출 (코어 개수, 총 세대수 자동계산 로직)
  - `Badge` 컴포넌트에 `info` variant 추가 (하늘색 계열)
  - Zod 스키마 강화 (`unitTypePatternSchema`, `floorHeightsSchema`, `buildingBasicInfoSchema`)

#### Added
- **컴포넌트 구조**:
  ```
  components/buildings/
  ├── hooks/
  │   └── useBuildingAutoCalculations.ts  # 자동계산 훅
  └── sections/
      ├── StructureInfoSection.tsx
      ├── UnitTypePatternSection.tsx
      └── FloorHeightSection.tsx
  ```

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