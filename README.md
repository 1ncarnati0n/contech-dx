# ConTech-DX

건축직영공사 공정관리 시스템

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Styling** | Tailwind CSS 4 |
| **UI** | Radix UI, Framer Motion |
| **AI** | Google Gemini API (File Search) |
| **Form** | React Hook Form + Zod |

## Getting Started

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (container)/              # Route Group (메인 컨텐츠)
│   │   ├── admin/                # 관리자 페이지
│   │   ├── login/                # 로그인
│   │   ├── signup/               # 회원가입
│   │   ├── posts/                # 게시판
│   │   ├── profile/              # 프로필
│   │   ├── projects/             # 프로젝트 관리
│   │   └── layout.tsx
│   ├── api/gemini/               # Gemini AI API Routes
│   ├── auth/callback/            # Supabase Auth Callback
│   └── file-search/              # AI 파일 검색
│
├── components/
│   ├── ui/                       # 디자인 시스템 (Button, Card, Dialog...)
│   ├── auth/                     # 인증 (LoginForm, SignupForm)
│   ├── posts/                    # 게시글
│   ├── comments/                 # 댓글
│   ├── projects/                 # 프로젝트 관리 컴포넌트
│   ├── layout/                   # NavBar, ThemeToggle
│   ├── file-search/              # AI 파일 검색
│   └── admin/                    # 관리자 컴포넌트
│
├── lib/
│   ├── types.ts                  # 타입 정의 (Single Source of Truth)
│   ├── constants.ts              # 상수 정의
│   ├── utils.ts                  # cn() 등 기본 유틸
│   ├── utils/                    # 📦 유틸리티 모듈
│   │   ├── formatters.ts         # 날짜, 통화 포맷팅
│   │   ├── project-status.ts     # 프로젝트 상태 색상/라벨
│   │   ├── logger.ts             # 환경별 로깅
│   │   └── index.ts              # 통합 export
│   ├── supabase/                 # Supabase 클라이언트
│   ├── services/                 # 비즈니스 로직
│   │   ├── posts.ts
│   │   ├── comments.ts
│   │   ├── users.ts
│   │   ├── projects.ts           # 프로젝트 CRUD
│   │   ├── projectMembers.ts     # 프로젝트 멤버 관리
│   │   └── gemini.ts
│   └── permissions/              # 권한 관리
│
└── styles/
    └── globals.css               # 글로벌 스타일 + 테마
```

## Key Features

### 프로젝트 관리
- 프로젝트 CRUD (생성, 조회, 수정, 삭제)
- 상태 관리 (기획, 진행중, 완료, 보류, 취소)
- 프로젝트 멤버 관리
- 관리자 전용 테스트(dummy) 프로젝트

### AI 파일 검색
- Gemini API 기반 문서 검색
- 스토어 생성/삭제
- 파일 업로드 및 RAG 검색

## Import 규칙

```typescript
// 유틸리티 함수 사용
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
```

## 유틸리티 사용법

```typescript
// 포맷팅
formatCurrency(15000000000);           // "₩150억"
formatDate('2025-11-29', 'long');      // "2025년 11월 29일"

// 프로젝트 상태
getStatusLabel('active');              // "진행중"
getStatusColors('active');             // Tailwind CSS 클래스

// 로깅 (개발 환경에서만 출력)
logger.debug('디버그 정보', data);
logger.error('에러 발생', error);       // 항상 출력
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

SQL 파일 위치: `sql/` 폴더
- `schema/` - 테이블 스키마
- `migrations/` - 마이그레이션
- `seeds/` - 샘플 데이터

## Documentation

프로젝트 문서: `docs/` 폴더
- 코드 리뷰 및 리팩토링 계획
- 프로젝트 상태 문서
- 설정 가이드
