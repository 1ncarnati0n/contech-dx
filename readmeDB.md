# ConTech-DX Database Documentation

Supabase PostgreSQL 데이터베이스 스키마 및 연결 설정 가이드

## 목차

- [환경 설정](#환경-설정)
- [연결 방법](#연결-방법)
- [테이블 스키마](#테이블-스키마)
- [TypeScript 타입 매핑](#typescript-타입-매핑)
- [RLS 정책](#rls-정책)
- [마이그레이션 가이드](#마이그레이션-가이드)
- [서비스 레이어](#서비스-레이어)

---

## 환경 설정

`.env.local` 파일에 다음 환경 변수를 설정합니다:

```bash
# Supabase 연결 정보
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI (선택)
GEMINI_API_KEY=your_gemini_api_key
```

Supabase 대시보드 > Settings > API에서 확인 가능합니다.

---

## 연결 방법

### 클라이언트 사이드 (Client Component)

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@/lib/supabase/client';

// 사용 예시
const supabase = createClient();
const { data, error } = await supabase
  .from('projects')
  .select('*');
```

### 서버 사이드 (Server Component / Server Actions)

```typescript
// src/lib/supabase/server.ts
import { createClient } from '@/lib/supabase/server';

// 사용 예시 (async 필수)
const supabase = await createClient();
const { data, error } = await supabase
  .from('projects')
  .select('*');
```

---

## 테이블 스키마

### 테이블 개요

| 테이블 | 설명 |
|--------|------|
| `profiles` | 사용자 프로필 (auth.users와 연동) |
| `posts` | 게시글 |
| `comments` | 댓글 |
| `projects` | 건축 직영공사 프로젝트 |
| `project_members` | 프로젝트 팀원 |
| `gantt_charts` | 간트 차트 |
| `tasks` | 간트 작업 |
| `links` | 작업 의존성 (간트 연결선) |
| `user_activity_logs` | 사용자 활동 로그 |

---

### profiles

사용자 프로필 정보를 저장합니다. Supabase Auth의 `auth.users`와 연동됩니다.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'main_user', 'vip_user', 'user')),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK, auth.users 참조 |
| `email` | TEXT | 이메일 주소 |
| `role` | TEXT | 사용자 역할 (admin, main_user, vip_user, user) |
| `display_name` | TEXT | 표시 이름 |
| `avatar_url` | TEXT | 프로필 이미지 URL |
| `bio` | TEXT | 자기소개 |
| `created_at` | TIMESTAMPTZ | 생성일시 |
| `updated_at` | TIMESTAMPTZ | 수정일시 (자동 업데이트) |

**역할 레벨:**

| Role | 레벨 | 설명 |
|------|------|------|
| `admin` | 4 | 시스템 관리자 - 모든 권한 |
| `main_user` | 3 | 주요 사용자 |
| `vip_user` | 2 | VIP 사용자 |
| `user` | 1 | 일반 사용자 |

---

### posts

게시글 정보를 저장합니다.

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `title` | TEXT | 제목 |
| `content` | TEXT | 내용 |
| `author_id` | UUID | 작성자 ID (profiles 참조) |
| `created_at` | TIMESTAMPTZ | 생성일시 |
| `updated_at` | TIMESTAMPTZ | 수정일시 |

---

### comments

댓글 정보를 저장합니다.

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `post_id` | UUID | 게시글 ID (posts 참조) |
| `content` | TEXT | 댓글 내용 |
| `author_id` | UUID | 작성자 ID (profiles 참조) |
| `created_at` | TIMESTAMPTZ | 생성일시 |

---

### projects

건축 직영공사 프로젝트 정보를 저장합니다.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number SERIAL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  client TEXT,
  contract_amount NUMERIC(15, 2),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'announcement'
    CHECK (status IN ('announcement', 'bidding', 'award', 'construction_start', 'completion')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `project_number` | SERIAL | 프로젝트 번호 (자동 증가) |
| `name` | TEXT | 프로젝트명 |
| `description` | TEXT | 설명 |
| `location` | TEXT | 공사 위치 |
| `client` | TEXT | 발주처 |
| `contract_amount` | NUMERIC(15,2) | 계약금액 (원) |
| `start_date` | DATE | 시작일 |
| `end_date` | DATE | 종료일 |
| `status` | TEXT | 상태 |
| `created_by` | UUID | 생성자 ID |
| `created_at` | TIMESTAMPTZ | 생성일시 |
| `updated_at` | TIMESTAMPTZ | 수정일시 |

**프로젝트 상태:**

| Status | 한글 | 설명 |
|--------|------|------|
| `announcement` | 공모 | 프로젝트 공모 단계 |
| `bidding` | 입찰 | 입찰 진행 중 |
| `award` | 수주 | 수주 확정 |
| `construction_start` | 착공 | 공사 시작 |
| `completion` | 준공 | 공사 완료 |

---

### project_members

프로젝트 팀원 할당 정보를 저장합니다.

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member'
    CHECK (role IN ('pm', 'engineer', 'supervisor', 'worker', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `project_id` | UUID | 프로젝트 ID |
| `user_id` | UUID | 사용자 ID |
| `role` | TEXT | 프로젝트 내 역할 |
| `created_at` | TIMESTAMPTZ | 할당일시 |

**프로젝트 멤버 역할:**

| Role | 한글 | 설명 |
|------|------|------|
| `pm` | 프로젝트 매니저 | 프로젝트 총괄 |
| `engineer` | 엔지니어 | 기술 담당 |
| `supervisor` | 감독자 | 현장 감독 |
| `worker` | 작업자 | 현장 작업 |
| `member` | 일반 멤버 | 기본 멤버 |

---

### gantt_charts

간트 차트 정보를 저장합니다.

```sql
CREATE TABLE gantt_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `project_id` | UUID | 프로젝트 ID |
| `name` | TEXT | 차트명 |
| `description` | TEXT | 설명 |
| `start_date` | TEXT | 시작일 (ISO 8601) |
| `end_date` | TEXT | 종료일 (ISO 8601) |
| `created_at` | TIMESTAMPTZ | 생성일시 |
| `updated_at` | TIMESTAMPTZ | 수정일시 |

---

### tasks

간트 차트의 작업(Task) 정보를 저장합니다.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gantt_chart_id UUID NOT NULL REFERENCES gantt_charts(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'task' CHECK (type IN ('task', 'milestone', 'project', 'summary')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  parent_id TEXT,
  position INTEGER DEFAULT 0,
  open BOOLEAN DEFAULT true,
  assigned_to TEXT,
  category TEXT,
  work_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `gantt_chart_id` | UUID | 간트 차트 ID |
| `text` | TEXT | 작업명 |
| `type` | TEXT | 작업 유형 (task, milestone, project, summary) |
| `start_date` | TEXT | 시작일 (ISO 8601) |
| `end_date` | TEXT | 종료일 |
| `progress` | INTEGER | 진행률 (0-100) |
| `parent_id` | TEXT | 부모 작업 ID |
| `position` | INTEGER | 정렬 순서 |
| `open` | BOOLEAN | 펼침 상태 |
| `assigned_to` | TEXT | 담당자 |
| `category` | TEXT | 카테고리 |
| `work_type` | TEXT | 공종 |

---

### links

작업 간 의존성(연결선) 정보를 저장합니다.

```sql
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gantt_chart_id UUID NOT NULL REFERENCES gantt_charts(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  type TEXT DEFAULT 'e2s' CHECK (type IN ('e2s', 's2s', 'e2e', 's2e')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `gantt_chart_id` | UUID | 간트 차트 ID |
| `source` | TEXT | 시작 작업 ID |
| `target` | TEXT | 종료 작업 ID |
| `type` | TEXT | 연결 유형 |

**연결 유형:**

| Type | 설명 |
|------|------|
| `e2s` | End to Start (기본값) |
| `s2s` | Start to Start |
| `e2e` | End to End |
| `s2e` | Start to End |

---

### user_activity_logs

사용자 활동 로그를 저장합니다.

```sql
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `user_id` | UUID | 사용자 ID |
| `action` | TEXT | 수행한 액션 |
| `details` | JSONB | 상세 정보 |
| `ip_address` | TEXT | IP 주소 |
| `created_at` | TIMESTAMPTZ | 발생일시 |

---

## TypeScript 타입 매핑

타입 정의 파일: `src/lib/types.ts`

### 주요 타입

```typescript
// 사용자 역할
type UserRole = 'admin' | 'main_user' | 'vip_user' | 'user';

// 프로젝트 상태
type ProjectStatus = 'announcement' | 'bidding' | 'award' | 'construction_start' | 'completion';

// 프로젝트 멤버 역할
type ProjectMemberRole = 'pm' | 'engineer' | 'supervisor' | 'worker' | 'member';

// 프로필 인터페이스
interface Profile {
  id: string;
  email: string;
  role: UserRole;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string;
}

// 프로젝트 인터페이스
interface Project {
  id: string;
  project_number: number;
  name: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date: string;
  end_date?: string;
  status: ProjectStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// 프로젝트 멤버 인터페이스
interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
  user?: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}
```

### Import 예시

```typescript
import type {
  UserRole,
  ProjectStatus,
  Project,
  Profile,
  ProjectMember
} from '@/lib/types';
```

---

## RLS 정책

Row Level Security(RLS) 정책으로 데이터 접근을 제어합니다.

### profiles

| 정책 | 작업 | 조건 |
|------|------|------|
| 읽기 | SELECT | 모든 사용자 |
| 수정 | UPDATE | 본인 또는 Admin |
| 삭제 | DELETE | Admin만 |

### projects

| 정책 | 작업 | 조건 |
|------|------|------|
| 읽기 | SELECT | 모든 사용자 |
| 생성 | INSERT | 인증된 사용자 |
| 수정 | UPDATE | 생성자 또는 PM/Engineer 멤버 |
| 삭제 | DELETE | 생성자 또는 Admin |

### project_members

| 정책 | 작업 | 조건 |
|------|------|------|
| 읽기 | SELECT | 모든 사용자 |
| 추가 | INSERT | 프로젝트 생성자 또는 PM |
| 수정 | UPDATE | 프로젝트 생성자 또는 PM |
| 삭제 | DELETE | 프로젝트 생성자 또는 PM |

### gantt_charts / tasks / links

| 정책 | 작업 | 조건 |
|------|------|------|
| 읽기 | SELECT | 프로젝트 멤버 또는 생성자 |
| 생성 | INSERT | PM/Engineer 멤버 또는 생성자 |
| 수정 | UPDATE | PM/Engineer 멤버 또는 생성자 |
| 삭제 | DELETE | PM 멤버 또는 생성자 |

---

## 마이그레이션 가이드

### SQL 파일 위치

```
sql/
├── schema/
│   ├── schema-roles.sql      # 1. 역할 시스템
│   └── schema-projects.sql   # 2. 프로젝트 관리 시스템
├── migrations/
│   ├── add_project_number.sql
│   ├── fix-date-type-issue.sql
│   ├── fix-existing-tables.sql
│   ├── update-project-status-values.sql
│   └── update-schema-for-dummy.sql
└── seeds/
    └── seed-construction-sample.sql
```

### 실행 순서

1. **기본 스키마** (Supabase 기본 posts, comments, profiles)
2. **schema-roles.sql** - 역할 시스템 추가
3. **schema-projects.sql** - 프로젝트 관리 테이블
4. **migrations/*.sql** - 날짜순 실행

### 실행 방법

Supabase 대시보드 > SQL Editor에서 실행:

```sql
-- 1. 역할 시스템
\i sql/schema/schema-roles.sql

-- 2. 프로젝트 시스템
\i sql/schema/schema-projects.sql
```

---

## 서비스 레이어

데이터베이스 작업은 서비스 레이어를 통해 처리합니다.

### 파일 구조

```
src/lib/services/
├── cache.ts           # TTL 기반 캐싱
├── projects.ts        # 프로젝트 CRUD
├── projectMembers.ts  # 프로젝트 멤버 관리
├── buildings.ts       # 동/층 관리
├── posts.ts           # 게시글
├── comments.ts        # 댓글
├── users.ts           # 사용자
└── gemini.ts          # Gemini AI
```

### 사용 예시

```typescript
// 프로젝트 서비스
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from '@/lib/services/projects';

// 프로젝트 목록 조회 (캐싱 적용)
const projects = await getProjects();

// 프로젝트 생성
const newProject = await createProject({
  name: '신규 프로젝트',
  start_date: '2025-01-01',
  status: 'announcement'
});
```

### 캐싱 전략

```typescript
import { MemoryCache, DEFAULT_TTL, SHORT_TTL, LONG_TTL } from '@/lib/services/cache';

// TTL 상수
DEFAULT_TTL = 5 * 60 * 1000;  // 5분
SHORT_TTL = 1 * 60 * 1000;    // 1분
LONG_TTL = 15 * 60 * 1000;    // 15분

// 캐시 사용 예시
const cache = new MemoryCache<Project[]>({ name: 'projects' });

// 캐시 조회 또는 fetch
const projects = await cache.getOrFetch('all', async () => {
  const { data } = await supabase.from('projects').select('*');
  return data;
});

// 캐시 무효화 (CRUD 작업 후)
cache.invalidate('all');
```

---

## ER 다이어그램

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   profiles  │────<│  project_members │>────│    projects    │
└─────────────┘     └──────────────────┘     └────────────────┘
       │                                            │
       │                                            │
       ▼                                            ▼
┌─────────────┐                              ┌────────────────┐
│    posts    │                              │  gantt_charts  │
└─────────────┘                              └────────────────┘
       │                                            │
       │                                    ┌───────┴───────┐
       ▼                                    ▼               ▼
┌─────────────┐                        ┌─────────┐   ┌─────────┐
│  comments   │                        │  tasks  │   │  links  │
└─────────────┘                        └─────────┘   └─────────┘
```

---

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript 타입 정의](./src/lib/types.ts)
