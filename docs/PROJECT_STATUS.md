# 🚧 Contech-DX 프로젝트 현재 상태

> **건설 직영공사 프로젝트 관리 시스템**  
> 최종 업데이트: 2025-11-25

---

## 📊 프로젝트 개요

**목표**: 건설 프로젝트의 일정 관리를 위한 Gantt 차트 기반 웹 애플리케이션

**기술 스택**:
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Gantt Chart**: @svar-ui/react-gantt
- **UI**: Tailwind CSS, Radix UI
- **Form**: React Hook Form + Zod

---

## ✅ 구현 완료 기능

### 1️⃣ 인증 및 권한 관리
- ✅ Supabase Auth (이메일/비밀번호)
- ✅ 역할 기반 접근 제어 (RBAC)
  - `viewer`, `member`, `creator`, `moderator`, `admin`, `system_admin`
- ✅ Row Level Security (RLS) 정책
- ✅ Server/Client Supabase 클라이언트 분리

### 2️⃣ 프로젝트 관리
- ✅ 프로젝트 CRUD
  - 생성, 조회, 수정, 삭제
- ✅ 프로젝트 목록 (검색, 필터링)
- ✅ 프로젝트 상태 관리
  - `planning`, `active`, `completed`, `on_hold`, `cancelled`, **`dummy`** (관리자 전용)
- ✅ 프로젝트 생성 모달 (React Hook Form)
- ✅ 관리자 전용 기능
  - Dummy 프로젝트 생성
  - 자동 Gantt 차트 생성 (mock.json 기반)

### 3️⃣ Gantt 차트
- ✅ Gantt 차트 CRUD
- ✅ Task 관리 (작업 생성, 수정, 삭제)
- ✅ Link 관리 (작업 간 의존성)
- ✅ Gantt 차트 시각화 (@svar-ui/react-gantt)
- ✅ Task 편집 (인라인 편집, 드래그 앤 드롭)
- ✅ 한국 공휴일 지원
- ✅ Mock 데이터 → Supabase 변환

### 4️⃣ UI/UX
- ✅ 반응형 디자인
- ✅ 다크 모드 지원
- ✅ 관리자 드롭다운 메뉴
- ✅ 프로젝트 카드 (상태별 색상 구분)
- ✅ Gantt 테스트 페이지 (/gantt-test)

---

## 🗂️ 데이터베이스 구조

### **테이블 목록**

#### 1. `profiles` (사용자 정보)
```sql
id UUID PRIMARY KEY              -- Supabase Auth User ID
email TEXT UNIQUE NOT NULL
username TEXT UNIQUE
full_name TEXT
role TEXT DEFAULT 'viewer'       -- RBAC 역할
```

#### 2. `projects` (프로젝트)
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT
location TEXT
client TEXT
contract_amount NUMERIC
start_date TEXT                  -- ⚠️ TEXT 타입 (YYYY-MM-DD)
end_date TEXT
status TEXT DEFAULT 'planning'   -- dummy 포함
created_by UUID REFERENCES profiles(id)
```

#### 3. `project_members` (프로젝트 멤버)
```sql
project_id UUID REFERENCES projects(id)
user_id UUID REFERENCES profiles(id)
role TEXT DEFAULT 'member'       -- pm, engineer, viewer
```

#### 4. `gantt_charts` (Gantt 차트)
```sql
id UUID PRIMARY KEY
project_id UUID REFERENCES projects(id)
name TEXT NOT NULL
description TEXT
start_date TEXT
end_date TEXT
```

#### 5. `tasks` (작업)
```sql
id UUID PRIMARY KEY
gantt_chart_id UUID REFERENCES gantt_charts(id)
text TEXT NOT NULL
type TEXT                        -- task, project, milestone
start_date TEXT
end_date TEXT
progress NUMERIC DEFAULT 0
parent_id UUID                   -- 부모 작업 (계층 구조)
```

#### 6. `links` (작업 연결)
```sql
id UUID PRIMARY KEY
gantt_chart_id UUID REFERENCES gantt_charts(id)
source UUID REFERENCES tasks(id)
target UUID REFERENCES tasks(id)
type TEXT                        -- 0(FS), 1(SS), 2(FF), 3(SF)
```

---

## 🔧 최근 수정 사항

### **문제 1: 날짜 타입 불일치** ⚠️
**증상**:
```
Error: invalid input syntax for type date: ""
```

**원인**:
- Supabase: `DATE` 타입 (PostgreSQL 네이티브)
- 애플리케이션: `TEXT` ('YYYY-MM-DD' 문자열)
- 충돌: 빈 문자열 `""` → DATE 변환 실패

**해결**:
1. **데이터베이스**: `sql/migrations/fix-date-type-issue.sql`
   ```sql
   ALTER TABLE projects ALTER COLUMN start_date TYPE TEXT;
   ALTER TABLE projects ALTER COLUMN end_date TYPE TEXT;
   ```

2. **애플리케이션**: 
   - `ProjectCreateModal.tsx`: 빈 문자열 → `undefined` 변환
   - `projects.ts`: `undefined`, 빈 문자열 필터링

### **문제 2: Dummy 프로젝트가 안 보임**
**원인**: `dummy` 상태가 CHECK 제약 조건에 없음

**해결**: `sql/migrations/update-schema-for-dummy.sql`
```sql
ALTER TABLE projects
ADD CONSTRAINT projects_status_check
CHECK (status IN ('planning', 'active', 'completed', 'on_hold', 'cancelled', 'dummy'));
```

### **문제 3: Gantt 차트 자동 생성**
**구현**:
- `mockDataConverter.ts`: mock.json → Supabase 형식 변환
- `ganttCharts.ts`: `createSampleGanttChartForDummyProject()`
  - Gantt 차트 생성
  - Tasks 배치 생성 (18개)
  - Links 배치 생성 (5개)
  - ID 매핑 (temp:// → UUID)

---

## 📁 주요 파일 구조

```
contech-dx/
├── sql/                           🗄️ SQL 파일
│   ├── README.md                  📖 실행 가이드
│   ├── schema/                    📋 메인 스키마
│   │   ├── schema-roles.sql
│   │   └── schema-projects.sql
│   ├── migrations/                🔧 스키마 수정
│   │   ├── fix-existing-tables.sql
│   │   ├── fix-date-type-issue.sql     ⭐ 필수!
│   │   └── update-schema-for-dummy.sql
│   └── seeds/                     🌱 샘플 데이터
│       └── seed-construction-sample.sql
│
├── src/
│   ├── app/                       📄 페이지
│   │   ├── (container)/
│   │   │   ├── projects/          프로젝트 목록
│   │   │   │   ├── page.tsx       (Server Component)
│   │   │   │   └── [id]/          프로젝트 상세
│   │   │   │       └── page.tsx
│   │   │   └── gantt-test/        Gantt 테스트
│   │   └── api/
│   │       └── mock/              Mock 데이터 API
│   │
│   ├── components/                🧩 컴포넌트
│   │   ├── layout/
│   │   │   ├── NavBar.tsx         네비게이션 바
│   │   │   └── AdminDropdown.tsx  관리자 메뉴
│   │   ├── projects/
│   │   │   ├── ProjectList.tsx    (Client Component)
│   │   │   ├── ProjectCard.tsx    프로젝트 카드
│   │   │   ├── ProjectCreateModal.tsx  생성 모달
│   │   │   └── ProjectDetailClient.tsx
│   │   ├── gantt/
│   │   │   ├── GanttChart.tsx     Gantt 차트
│   │   │   ├── GanttControls.tsx  컨트롤
│   │   │   └── TaskTooltip.tsx    툴팁
│   │   └── ui/                    UI 컴포넌트
│   │
│   └── lib/                       🔧 유틸리티
│       ├── supabase/
│       │   ├── client.ts          Client Component용
│       │   └── server.ts          Server Component용
│       ├── services/              데이터 서비스
│       │   ├── projects.ts
│       │   ├── ganttCharts.ts
│       │   ├── tasks.ts
│       │   └── links.ts
│       ├── gantt/
│       │   ├── hooks/
│       │   │   └── useGanttData.ts
│       │   └── utils/
│       │       └── mockDataConverter.ts  ⭐ Mock → Supabase
│       ├── permissions/
│       │   └── server.ts          권한 체크
│       └── types.ts               타입 정의
│
└── docs/                          📚 문서
    ├── PROJECT_STATUS.md          이 파일
    ├── PHASE6_COMPLETION_STRATEGY.md
    └── NEXT_PHASE_STRATEGY.md
```

---

## 🚀 실행 방법

### **1️⃣ 환경 설정**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_USE_MOCK=false
```

### **2️⃣ 데이터베이스 설정**
Supabase SQL Editor에서 순서대로 실행:

```
1. sql/schema/schema-roles.sql
2. sql/schema/schema-projects.sql
3. sql/migrations/fix-date-type-issue.sql     ⭐ 필수!
4. sql/migrations/update-schema-for-dummy.sql
5. sql/seeds/seed-construction-sample.sql     (선택)
```

자세한 내용: `sql/README.md` 참고

### **3️⃣ 의존성 설치 및 실행**
```bash
npm install
npm run dev
```

### **4️⃣ 테스트**
1. 회원가입: `/auth/signup`
2. 프로필 생성 (자동)
3. 프로젝트 목록: `/projects`
4. 새 프로젝트 생성
5. Gantt 차트 생성

---

## 🎯 현재 작업 가능한 기능

### **일반 사용자**
- ✅ 프로젝트 조회 (참여 중인 프로젝트만)
- ✅ Gantt 차트 조회
- ✅ Task 조회

### **프로젝트 멤버 (PM, Engineer)**
- ✅ Gantt 차트 생성, 수정
- ✅ Task 생성, 수정, 삭제
- ✅ Link 생성, 수정, 삭제

### **프로젝트 생성자**
- ✅ 프로젝트 수정, 삭제
- ✅ 멤버 관리

### **관리자 (System Admin)**
- ✅ 모든 프로젝트 조회
- ✅ Dummy 프로젝트 생성
  - mock.json 기반 Gantt 차트 자동 생성
  - 18개 Tasks, 5개 Links 자동 생성
- ✅ Gantt 테스트 페이지 접근 (/gantt-test)

---

## 🐛 알려진 이슈

### **1. 날짜 타입 불일치** ⚠️
**상태**: 해결됨  
**해결**: `sql/migrations/fix-date-type-issue.sql` 실행

### **2. Dummy 프로젝트 안 보임**
**상태**: 해결됨  
**해결**: `sql/migrations/update-schema-for-dummy.sql` 실행

### **3. Mock 데이터 ID 매핑**
**상태**: 해결됨  
**해결**: `mockDataConverter.ts`에서 ID 매핑 처리

---

## 📝 다음 단계 (To-Do)

### **Phase 1: 기본 CRUD 안정화** (진행 중)
- [ ] 프로젝트 생성 테스트
- [ ] Dummy 프로젝트 Gantt 차트 확인
- [ ] 날짜 타입 이슈 완전 해결

### **Phase 2: Gantt 차트 기능 강화**
- [ ] Task 드래그 앤 드롭 (날짜 변경)
- [ ] Task 계층 구조 (Parent-Child)
- [ ] Task 진행률 업데이트
- [ ] Link 타입별 제약 조건 (FS, SS, FF, SF)

### **Phase 3: 협업 기능**
- [ ] 멤버 초대 (이메일)
- [ ] 역할별 권한 세분화
- [ ] 댓글 기능 (Task별)
- [ ] 알림 (Task 완료, 마감일 임박)

### **Phase 4: 리포트 및 분석**
- [ ] 프로젝트 대시보드
- [ ] 진행률 차트 (Chart.js)
- [ ] 공정 지연 분석
- [ ] Excel 내보내기

### **Phase 5: 모바일 최적화**
- [ ] 모바일 반응형 개선
- [ ] 터치 제스처 지원
- [ ] PWA 지원

---

## 🔍 검증 방법

### **1. 데이터베이스 검증**
```sql
-- 컬럼 타입 확인 (모두 TEXT여야 함)
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns
WHERE table_name IN ('projects', 'gantt_charts')
  AND column_name IN ('start_date', 'end_date');

-- CHECK 제약 조건 확인 (dummy 포함)
SELECT 
  conname, 
  pg_get_constraintdef(oid) 
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
  AND conname = 'projects_status_check';
```

### **2. 프로젝트 생성 테스트**
1. 로그인
2. `/projects` 페이지 이동
3. "새 프로젝트" 클릭
4. 필드 입력
   - 프로젝트명: "테스트 프로젝트"
   - 상태: "dummy" (관리자만)
   - 시작일: "2025-01-01"
   - 종료일: 비워두기 (빈 문자열 테스트)
5. "생성" 클릭
6. 프로젝트 상세 페이지로 리다이렉트
7. Gantt 차트 자동 생성 확인

### **3. Dummy Gantt 차트 확인**
```sql
-- Dummy 프로젝트 확인
SELECT * FROM projects WHERE status = 'dummy';

-- Gantt 차트 확인
SELECT * FROM gantt_charts WHERE project_id = '<dummy_project_id>';

-- Tasks 개수 확인 (18개)
SELECT COUNT(*) FROM tasks WHERE gantt_chart_id = '<gantt_chart_id>';

-- Links 개수 확인 (5개)
SELECT COUNT(*) FROM links WHERE gantt_chart_id = '<gantt_chart_id>';
```

---

## 📞 문제 해결

### **프로젝트 생성 실패**
1. `sql/migrations/fix-date-type-issue.sql` 실행 확인
2. 브라우저 콘솔 에러 확인
3. Supabase Logs 확인
4. RLS 정책 확인

### **Dummy 프로젝트 안 보임**
1. `sql/migrations/update-schema-for-dummy.sql` 실행 확인
2. 관리자 권한 확인 (`profiles.role = 'system_admin'`)
3. `ProjectList` 컴포넌트 `isAdmin` prop 확인

### **Gantt 차트 안 보임**
1. Gantt 차트 생성 로그 확인
2. Tasks, Links 데이터 확인
3. `mockDataConverter.ts` ID 매핑 로그 확인

---

**작성자**: AI Assistant  
**버전**: 2.0  
**최종 업데이트**: 2025-11-25

🚀 **현재 우선순위**: 프로젝트 CRUD 안정화 → Dummy Gantt 차트 테스트


