# ConTech-DX

라온아크테크 건축직영공사 공정관리 시스템

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS 4
- **UI**: Radix UI, Framer Motion
- **AI**: Google Gemini API (File Search)

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
├── app/                      # Next.js App Router
│   ├── (container)/          # Route Group (메인 컨텐츠)
│   │   ├── admin/            # 관리자 페이지
│   │   ├── login/            # 로그인
│   │   ├── signup/           # 회원가입
│   │   ├── posts/            # 게시판
│   │   ├── profile/          # 프로필
│   │   └── layout.tsx        # 그룹 레이아웃
│   ├── api/gemini/           # Gemini AI API Routes
│   ├── auth/callback/        # Supabase Auth Callback
│   ├── file-search/          # 파일 검색 (AI)
│   └── layout.tsx            # Root Layout
│
├── components/
│   ├── ui/                   # 디자인 시스템 (Button, Card, Dialog...)
│   ├── auth/                 # 인증 관련 (LoginForm, SignupForm)
│   ├── posts/                # 게시글 관련
│   ├── comments/             # 댓글 관련
│   ├── layout/               # 레이아웃 (NavBar, ThemeToggle)
│   ├── file-search/          # AI 파일 검색
│   └── admin/                # 관리자 컴포넌트
│
├── lib/
│   ├── types.ts              # 타입 정의 (Single Source of Truth)
│   ├── utils.ts              # 유틸리티 함수
│   ├── constants.ts          # 상수 정의
│   ├── animations.ts         # Framer Motion 애니메이션
│   ├── supabase/             # Supabase 클라이언트
│   │   ├── client.ts         # 브라우저용
│   │   ├── server.ts         # 서버용
│   │   └── middleware.ts     # 미들웨어용
│   ├── services/             # 비즈니스 로직
│   │   ├── posts.ts          # 게시글 CRUD
│   │   ├── comments.ts       # 댓글 CRUD
│   │   ├── users.ts          # 사용자 관리
│   │   └── gemini.ts         # Gemini AI 서비스
│   └── permissions/          # 권한 관리
│       ├── server.ts         # 서버용 (async)
│       ├── client.ts         # 클라이언트용
│       └── shared.ts         # 공통 유틸리티
│
└── styles/
    └── globals.css           # 글로벌 스타일
```

## Key Conventions

### Import 규칙

```typescript
// 서버 컴포넌트에서 권한 체크
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';

// 클라이언트 컴포넌트에서 권한 유틸리티
import { getRoleDisplayName } from '@/lib/permissions/client';

// 타입은 lib/types.ts에서
import type { Post, Profile, UserRole } from '@/lib/types';

// UI 컴포넌트는 barrel export
import { Button, Card, Dialog } from '@/components/ui';

// 서비스 레이어 사용
import { getPosts, createPost } from '@/lib/services/posts';
```

### 사용자 역할

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

Supabase SQL Editor에서 `schema.sql` 실행 후 사용
