# ConTech-DX

건축직영공사 공정관리 시스템

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **Database** | Supabase (PostgreSQL) |
| **Styling** | Tailwind CSS 4 |
| **UI** | Radix UI, Framer Motion |
| **Form** | React Hook Form + Zod |
| **AI** | Google Gemini API (File Search) |
| **Testing** | Jest + React Testing Library |
| **Caching** | TTL-based Memory Cache |

## Getting Started

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm run test

# 테스트 워치 모드
npm run test:watch

# 테스트 커버리지
npm run test:coverage
```

## Project Structure

```
src/
├── __tests__/                    # 테스트 파일
│   ├── components/               # 컴포넌트 테스트
│   └── utils/                    # 유틸리티 테스트
│
├── app/                          # Next.js App Router
│   ├── (container)/              # Route Group (메인 컨텐츠)
│   │   ├── admin/                # 관리자 페이지
│   │   ├── login/                # 로그인
│   │   ├── signup/               # 회원가입
│   │   ├── posts/                # 게시판
│   │   ├── profile/              # 프로필
│   │   ├── projects/             # 프로젝트 관리
│   │   └── layout.tsx
│   ├── api/                      # API Routes
│   │   ├── gemini/               # Gemini AI API
│   │   └── users/                # 사용자 API
│   ├── auth/callback/            # Supabase Auth Callback
│   └── file-search/              # AI 파일 검색
│
├── components/
│   ├── ui/                       # 디자인 시스템 (Button, Card, Dialog...)
│   ├── auth/                     # 인증 (LoginForm, SignupForm)
│   ├── posts/                    # 게시글
│   ├── comments/                 # 댓글
│   ├── projects/                 # 프로젝트 관리
│   ├── buildings/                # 동/층 관리
│   ├── layout/                   # NavBar, ThemeToggle
│   ├── file-search/              # AI 파일 검색
│   └── admin/                    # 관리자 컴포넌트
│
├── lib/
│   ├── types.ts                  # 타입 정의 (Single Source of Truth)
│   ├── constants.ts              # 상수 정의
│   ├── utils.ts                  # cn() 등 기본 유틸
│   ├── utils/                    # 유틸리티 모듈
│   │   ├── formatters.ts         # 날짜, 통화 포맷팅
│   │   ├── project-status.ts     # 프로젝트 상태 색상/라벨
│   │   ├── logger.ts             # 환경별 로깅
│   │   └── index.ts              # 통합 export
│   ├── hooks/                    # 커스텀 훅
│   │   ├── useAsyncData.ts       # 비동기 데이터 훅
│   │   ├── useTabDragDrop.ts     # 탭 드래그앤드롭 훅
│   │   └── index.ts
│   ├── supabase/                 # Supabase 클라이언트
│   │   ├── client.ts             # 클라이언트 사이드
│   │   └── server.ts             # 서버 사이드
│   ├── services/                 # 비즈니스 로직
│   │   ├── cache.ts              # TTL 기반 캐싱
│   │   ├── posts.ts
│   │   ├── comments.ts
│   │   ├── users.ts
│   │   ├── projects.ts           # 프로젝트 CRUD
│   │   ├── projectMembers.ts     # 프로젝트 멤버 관리
│   │   ├── buildings.ts          # 동/층 관리
│   │   └── gemini.ts
│   └── permissions/              # 권한 관리
│
└── styles/
    └── globals.css               # 글로벌 스타일 + 테마
```

## Architecture

### 캐싱 전략
- **TTL 기반 메모리 캐시** (`src/lib/services/cache.ts`)
- 기본 TTL: 5분, 짧은 TTL: 1분, 긴 TTL: 15분
- `getOrFetch()`: 캐시 확인 → 없으면 fetch → 저장
- CRUD 작업 시 자동 캐시 무효화

### 폼 처리 패턴
- **React Hook Form + Zod** 통일
- 서버 사이드 유효성 검증
- Toast 기반 에러/성공 메시지

### 에러 처리 패턴
- 표준 API 응답: `ApiResponse<T>` 타입
- 클라이언트: `toast.success()` / `toast.error()`
- 서버: `logger` 유틸리티 사용

## Key Features

### 프로젝트 관리
- 프로젝트 CRUD (생성, 조회, 수정, 삭제)
- 상태 관리 (공모, 입찰, 수주, 착공, 준공)
- 프로젝트 멤버 관리 (PM, 엔지니어, 감독자, 작업자)

### 건축 직영공사 데이터 관리
- 동(Building) 기본 정보 입력
- 층(Floor) 자동 생성 및 관리
- 공종별 물량 데이터 입력
- 공정 계획 수립

### AI 파일 검색
- Gemini API 기반 문서 검색
- 스토어 생성/삭제
- 파일 업로드 및 RAG 검색

## Import 규칙

```typescript
// 유틸리티 함수
import { formatCurrency, formatDate, logger } from '@/lib/utils/index';
import { getStatusLabel, getStatusColors } from '@/lib/utils/index';

// 서버 컴포넌트에서 권한 체크
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';

// 타입 import
import type { Project, Profile, UserRole } from '@/lib/types';

// UI 컴포넌트
import { Button, Card, Dialog } from '@/components/ui';

// 서비스 레이어
import { getProjects, createProject } from '@/lib/services/projects';

// 커스텀 훅
import { useAsyncData, useTabDragDrop } from '@/lib/hooks';
```

## 사용자 역할

| Role | 레벨 | 설명 |
|------|------|------|
| `admin` | 4 | 시스템 관리자 |
| `main_user` | 3 | 주요 사용자 |
| `vip_user` | 2 | VIP 사용자 |
| `user` | 1 | 일반 사용자 |

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
- 마이그레이션: `sql/migrations/`
- 샘플 데이터: `sql/seeds/`

**상세 스키마 및 연결 설정은 [readmeDB.md](./readmeDB.md) 참조**

## Documentation

프로젝트 문서: `docs/` 폴더
- 프로젝트 상태 문서
- 설정 가이드
- 기술 분석 보고서
