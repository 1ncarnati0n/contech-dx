# Gantt 차트 통합 리팩토링 전략

> **목표**: ConTech-DX에 건축 직영공사 프로젝트 관리 및 Gantt 차트 기능을 POC 수준으로 통합

## 📊 현재 상태 분석

### ✅ 이미 완료된 것
1. **Gantt 라이브러리**: `src/lib/gantt/` (18개 파일)
2. **Gantt 컴포넌트**: `src/components/gantt/` (9개 파일)
3. **서비스 레이어**: `ganttCharts`, `tasks`, `links` 서비스
4. **테스트 페이지**: `/gantt-test`
5. **User 관리**: `profiles` 테이블 (role 기반)
6. **인증 시스템**: Supabase Auth

### ❌ 부족한 것
1. **프로젝트 데이터 모델**: 건축 직영공사 정보를 담을 테이블
2. **프로젝트-유저 관계**: 프로젝트에 할당된 팀원 관리
3. **프로젝트 관리 페이지**: CRUD UI
4. **프로젝트 내 간트차트 관리**: 하나의 프로젝트에서 여러 간트차트 생성

---

## 🎯 POC 요구사항

### 1. **프로젝트 (Project)**
- 건축 직영공사 기본 정보 저장
- 프로젝트 생성/수정/삭제
- 프로젝트 목록 및 상세 보기

### 2. **프로젝트-유저 할당 (Project Members)**
- 프로젝트에 팀원 할당
- 역할 구분 (PM, 엔지니어, 작업자 등)
- 할당된 유저만 프로젝트 접근 가능

### 3. **간트차트 (Gantt Charts)**
- 하나의 프로젝트 내에서 여러 간트차트 생성
- 간트차트별 독립적인 Task/Link 관리
- 간트차트 템플릿 (예: 토목, 건축, 마감 등)

---

## 🗄️ 데이터 모델 설계

### ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│   auth.users    │
│   (Supabase)    │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐
│    profiles     │  (기존)
│─────────────────│
│ id (PK)         │
│ email           │
│ role            │
│ display_name    │
└────────┬────────┘
         │
         │ N:M (through project_members)
         │
         ▼
┌─────────────────┐      1:N      ┌──────────────────┐
│    projects     │◄───────────────┤  gantt_charts    │
│─────────────────│                │──────────────────│
│ id (PK)         │                │ id (PK)          │
│ name            │                │ project_id (FK)  │
│ description     │                │ name             │
│ location        │                │ description      │
│ client          │                │ start_date       │
│ contract_amount │                │ end_date         │
│ start_date      │                │ created_at       │
│ end_date        │                │ updated_at       │
│ status          │                └──────┬───────────┘
│ created_by (FK) │                       │
│ created_at      │                       │ 1:N
│ updated_at      │                       │
└────────┬────────┘                       ▼
         │                        ┌──────────────────┐
         │ 1:N                    │      tasks       │
         │                        │──────────────────│
         ▼                        │ id (PK)          │
┌─────────────────┐               │ gantt_chart_id   │
│project_members  │               │ text             │
│─────────────────│               │ start_date       │
│ id (PK)         │               │ end_date         │
│ project_id (FK) │               │ progress         │
│ user_id (FK)    │               │ ...              │
│ role            │               └──────────────────┘
│ created_at      │
└─────────────────┘               ┌──────────────────┐
                                  │      links       │
                                  │──────────────────│
                                  │ id (PK)          │
                                  │ gantt_chart_id   │
                                  │ source           │
                                  │ target           │
                                  │ type             │
                                  └──────────────────┘
```

### 테이블 정의

#### 1. `projects` (새로 생성)
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,                    -- 공사 위치
  client TEXT,                       -- 발주처
  contract_amount NUMERIC(15, 2),   -- 계약금액
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'planning',   -- 'planning', 'active', 'completed', 'on_hold'
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
```

#### 2. `project_members` (새로 생성)
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',       -- 'pm', 'engineer', 'worker', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)       -- 중복 방지
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
```

#### 3. `gantt_charts` (수정 필요)
```sql
-- 이미 복사된 서비스에서 사용 중
-- project_id 컬럼이 있으므로 FK만 추가
ALTER TABLE gantt_charts
ADD CONSTRAINT fk_gantt_charts_project
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
```

#### 4. `tasks`, `links` (기존 유지)
- 이미 `gantt_chart_id`로 연결되어 있음

---

## 🏗️ 페이지 구조 설계

### 라우팅 계층

```
/projects                          # 프로젝트 목록
/projects/[id]                     # 프로젝트 상세
/projects/[id]/gantt               # 프로젝트의 간트차트 목록
/projects/[id]/gantt/[chartId]     # 특정 간트차트 보기/편집
/projects/[id]/settings            # 프로젝트 설정 (멤버 관리)
```

### 페이지별 기능

#### 1. `/projects` - 프로젝트 목록
- **기능**:
  - 모든 프로젝트 카드 표시
  - 내가 참여한 프로젝트 필터
  - 프로젝트 생성 버튼 (관리자/PM)
  - 검색 및 정렬 (상태, 날짜)
- **컴포넌트**:
  - `ProjectList` (카드 그리드)
  - `ProjectCard` (개별 프로젝트)
  - `CreateProjectModal`

#### 2. `/projects/[id]` - 프로젝트 상세
- **기능**:
  - 프로젝트 기본 정보 표시
  - 진행 상황 대시보드
  - 간트차트 목록 (Quick View)
  - 멤버 목록
  - 최근 활동
- **컴포넌트**:
  - `ProjectHeader`
  - `ProjectDashboard`
  - `GanttChartList` (미니 카드)
  - `MemberList`

#### 3. `/projects/[id]/gantt` - 간트차트 목록
- **기능**:
  - 프로젝트 내 모든 간트차트 표시
  - 간트차트 생성/삭제
  - 템플릿 선택 (토목, 건축, 마감 등)
- **컴포넌트**:
  - `GanttChartGrid`
  - `CreateGanttChartModal`
  - `GanttTemplateSelector`

#### 4. `/projects/[id]/gantt/[chartId]` - 간트차트 편집
- **기능**:
  - 간트차트 렌더링
  - Task/Link 편집
  - 저장/불러오기
  - 공유 및 내보내기
- **컴포넌트**:
  - `GanttWrapper` (기존)
  - `GanttToolbar`
  - `GanttSaveButton`

#### 5. `/projects/[id]/settings` - 프로젝트 설정
- **기능**:
  - 프로젝트 정보 수정
  - 멤버 추가/제거
  - 역할 변경
  - 프로젝트 삭제
- **컴포넌트**:
  - `ProjectSettingsForm`
  - `MemberManagement`
  - `RoleSelector`

---

## 🔧 서비스 레이어 설계

### 1. `projects.ts` (새로 생성)
```typescript
export interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date: string;
  end_date?: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export async function getProjects(): Promise<Project[]>
export async function getProject(id: string): Promise<Project | null>
export async function createProject(data: CreateProjectDTO): Promise<Project>
export async function updateProject(id: string, data: UpdateProjectDTO): Promise<Project>
export async function deleteProject(id: string): Promise<void>
```

### 2. `projectMembers.ts` (새로 생성)
```typescript
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'pm' | 'engineer' | 'worker' | 'member';
  created_at: string;
  // Joined data
  user?: {
    email: string;
    display_name?: string;
  };
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]>
export async function addProjectMember(data: AddMemberDTO): Promise<ProjectMember>
export async function updateMemberRole(id: string, role: string): Promise<ProjectMember>
export async function removeProjectMember(id: string): Promise<void>
```

### 3. `ganttCharts.ts` (기존 수정)
```typescript
// project_id를 필수로 변경
export interface CreateGanttChartDTO {
  project_id: string; // 필수!
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
}

// 프로젝트별 간트차트 조회 강화
export async function getGanttChartsByProject(projectId: string): Promise<GanttChart[]>
```

---

## 🎨 컴포넌트 계층 설계

### 디렉토리 구조

```
src/components/
├── projects/                    # 새로 생성
│   ├── ProjectList.tsx
│   ├── ProjectCard.tsx
│   ├── ProjectHeader.tsx
│   ├── ProjectDashboard.tsx
│   ├── CreateProjectModal.tsx
│   ├── ProjectSettingsForm.tsx
│   └── index.ts
│
├── project-members/             # 새로 생성
│   ├── MemberList.tsx
│   ├── MemberCard.tsx
│   ├── AddMemberModal.tsx
│   ├── RoleSelector.tsx
│   └── index.ts
│
├── gantt-charts/                # 새로 생성 (프로젝트 맥락)
│   ├── GanttChartGrid.tsx
│   ├── GanttChartCard.tsx
│   ├── CreateGanttModal.tsx
│   ├── GanttTemplateSelector.tsx
│   └── index.ts
│
└── gantt/                       # 기존 (순수 Gantt 렌더링)
    ├── GanttWrapper.tsx
    ├── GanttChart.tsx
    └── ...
```

---

## 🚀 POC 구현 단계 (Phase-by-Phase)

### Phase 1: 데이터베이스 스키마 (1-2시간)
**목표**: 프로젝트 및 멤버 테이블 생성

1. ✅ `schema-projects.sql` 작성
2. ✅ Supabase에서 SQL 실행
3. ✅ RLS 정책 설정
4. ✅ 테스트 데이터 삽입

**완료 기준**:
- [ ] projects 테이블 생성
- [ ] project_members 테이블 생성
- [ ] gantt_charts FK 추가
- [ ] RLS 정책 동작 확인

---

### Phase 2: 서비스 레이어 (2-3시간)
**목표**: 프로젝트 및 멤버 CRUD API

1. ✅ `src/lib/services/projects.ts` 생성
2. ✅ `src/lib/services/projectMembers.ts` 생성
3. ✅ `src/lib/types.ts`에 타입 추가
4. ✅ Mock 데이터 생성 (LocalStorage)
5. ✅ 서비스 함수 테스트

**완료 기준**:
- [ ] 프로젝트 CRUD 동작
- [ ] 멤버 추가/제거 동작
- [ ] Mock 모드 동작
- [ ] TypeScript 에러 없음

---

### Phase 3: 프로젝트 목록 페이지 (3-4시간)
**목표**: `/projects` 페이지 구현

1. ✅ `src/app/(container)/projects/page.tsx` 생성
2. ✅ `ProjectList` 컴포넌트
3. ✅ `ProjectCard` 컴포넌트
4. ✅ `CreateProjectModal` 컴포넌트
5. ✅ 필터 및 검색 기능

**완료 기준**:
- [ ] 프로젝트 목록 표시
- [ ] 프로젝트 생성 동작
- [ ] 카드 클릭 시 상세 페이지 이동
- [ ] 반응형 디자인

---

### Phase 4: 프로젝트 상세 페이지 (4-5시간)
**목표**: `/projects/[id]` 페이지 구현

1. ✅ `src/app/(container)/projects/[id]/page.tsx` 생성
2. ✅ `ProjectHeader` 컴포넌트
3. ✅ `ProjectDashboard` 컴포넌트
4. ✅ `MemberList` 컴포넌트
5. ✅ 간트차트 Quick View

**완료 기준**:
- [ ] 프로젝트 정보 표시
- [ ] 멤버 목록 표시
- [ ] 간트차트 목록 미리보기
- [ ] 편집/삭제 버튼

---

### Phase 5: 간트차트 통합 (5-6시간)
**목표**: 프로젝트 내 간트차트 관리

1. ✅ `/projects/[id]/gantt/page.tsx` - 간트차트 목록
2. ✅ `/projects/[id]/gantt/[chartId]/page.tsx` - 간트차트 편집
3. ✅ `CreateGanttModal` 컴포넌트
4. ✅ `GanttChartGrid` 컴포넌트
5. ✅ 기존 `GanttWrapper` 연동

**완료 기준**:
- [ ] 프로젝트별 간트차트 목록
- [ ] 간트차트 생성/삭제
- [ ] 간트차트 편집 화면
- [ ] Task/Link 저장

---

### Phase 6: 멤버 관리 (2-3시간)
**목표**: 프로젝트 멤버 추가/제거

1. ✅ `/projects/[id]/settings/page.tsx` 생성
2. ✅ `MemberManagement` 컴포넌트
3. ✅ `AddMemberModal` 컴포넌트
4. ✅ `RoleSelector` 컴포넌트

**완료 기준**:
- [ ] 멤버 추가
- [ ] 멤버 제거
- [ ] 역할 변경
- [ ] 권한 검증

---

### Phase 7: 통합 테스트 & 버그 수정 (2-3시간)
**목표**: 전체 플로우 테스트

1. ✅ E2E 플로우 테스트
2. ✅ 권한 테스트
3. ✅ 버그 수정
4. ✅ UI/UX 개선

**완료 기준**:
- [ ] 프로젝트 생성 → 멤버 추가 → 간트차트 생성 → Task 추가
- [ ] 권한별 접근 제어 동작
- [ ] 에러 핸들링
- [ ] 반응형 확인

---

## 📋 권한 및 보안 (RLS)

### 프로젝트 접근 권한

```sql
-- projects 테이블
CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project creators and members can update"
  ON projects FOR UPDATE
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = projects.id
    )
  );

-- project_members 테이블
CREATE POLICY "Anyone can view project members"
  ON project_members FOR SELECT
  USING (true);

CREATE POLICY "Project owners can manage members"
  ON project_members FOR ALL
  USING (
    auth.uid() IN (
      SELECT created_by FROM projects
      WHERE id = project_members.project_id
    )
  );
```

---

## 🎯 POC 성공 기준

### 기능적 요구사항
- ✅ 프로젝트 생성/수정/삭제
- ✅ 프로젝트에 유저 할당/제거
- ✅ 하나의 프로젝트에서 여러 간트차트 생성
- ✅ 간트차트별 Task/Link 독립 관리
- ✅ 권한 기반 접근 제어

### 비기능적 요구사항
- ✅ 반응형 디자인
- ✅ Dark/Light 테마 지원
- ✅ 에러 핸들링
- ✅ Loading 상태 표시
- ✅ TypeScript 타입 안정성

---

## 📊 예상 소요 시간

| Phase | 내용 | 시간 |
|-------|------|------|
| Phase 1 | 데이터베이스 스키마 | 1-2h |
| Phase 2 | 서비스 레이어 | 2-3h |
| Phase 3 | 프로젝트 목록 | 3-4h |
| Phase 4 | 프로젝트 상세 | 4-5h |
| Phase 5 | 간트차트 통합 | 5-6h |
| Phase 6 | 멤버 관리 | 2-3h |
| Phase 7 | 통합 테스트 | 2-3h |
| **총합** | | **19-26h** |

**추정**: 3-4일 작업 (하루 6-8시간 기준)

---

## 🚧 리스크 및 고려사항

### 1. 데이터 마이그레이션
- **현재**: 테스트 데이터만 있음
- **대응**: Mock 모드로 로컬 개발, Supabase는 나중에

### 2. 권한 복잡도
- **리스크**: RLS 정책이 복잡해질 수 있음
- **대응**: POC에서는 간단한 권한만 (소유자 vs 멤버)

### 3. Gantt 차트 성능
- **리스크**: Task가 많아지면 느려질 수 있음
- **대응**: 페이지네이션, 가상 스크롤 (Phase 2에서)

### 4. 동시 편집
- **리스크**: 여러 사용자가 동시에 편집하면 충돌
- **대응**: POC에서는 제외, 나중에 WebSocket 고려

---

## 🎉 다음 단계

이 전략 문서가 승인되면:

1. **Phase 1부터 시작**: 데이터베이스 스키마 작성
2. **단계별 검증**: 각 Phase 완료 후 테스트
3. **피드백 반영**: 사용자 테스트 후 수정
4. **Production 준비**: 최종 검증 및 배포

---

**작성일**: 2025-11-24  
**버전**: 1.0.0  
**상태**: 초안 (검토 필요)

