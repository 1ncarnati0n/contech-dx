-- =========================================
-- ConTech-DX 프로젝트 관리 시스템 스키마
-- =========================================
-- 건축 직영공사 프로젝트 및 Gantt 차트 관리를 위한 데이터베이스 스키마
-- 
-- 실행 순서:
-- 1. 이 파일을 Supabase SQL Editor에서 실행
-- 2. 기존 schema.sql, schema-roles.sql이 먼저 실행되어 있어야 함
-- 
-- 작성일: 2025-11-24
-- 버전: 1.0.0
-- =========================================

-- =========================================
-- 1. PROJECTS 테이블
-- =========================================
-- 건축 직영공사 프로젝트 정보를 저장합니다.

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 정보
  name TEXT NOT NULL,
  description TEXT,
  
  -- 건축 프로젝트 정보
  location TEXT,                      -- 공사 위치
  client TEXT,                         -- 발주처/클라이언트
  contract_amount NUMERIC(15, 2),     -- 계약금액 (원)
  
  -- 일정
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- 상태
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'on_hold', 'cancelled')),
  
  -- 메타 정보
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at_trigger ON projects;

CREATE TRIGGER update_projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- 코멘트 추가
COMMENT ON TABLE projects IS '건축 직영공사 프로젝트 정보';
COMMENT ON COLUMN projects.name IS '프로젝트명';
COMMENT ON COLUMN projects.location IS '공사 위치 (주소)';
COMMENT ON COLUMN projects.client IS '발주처/클라이언트명';
COMMENT ON COLUMN projects.contract_amount IS '계약금액 (원)';
COMMENT ON COLUMN projects.status IS '프로젝트 상태: planning(기획), active(진행중), completed(완료), on_hold(보류), cancelled(취소)';

-- =========================================
-- 2. PROJECT_MEMBERS 테이블
-- =========================================
-- 프로젝트에 할당된 팀원 정보를 저장합니다.

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 관계
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 역할
  role TEXT DEFAULT 'member' CHECK (role IN ('pm', 'engineer', 'supervisor', 'worker', 'member')),
  
  -- 메타 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 중복 방지: 한 프로젝트에 같은 유저 한 번만 참여
  UNIQUE(project_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- 코멘트 추가
COMMENT ON TABLE project_members IS '프로젝트 팀원 할당 정보';
COMMENT ON COLUMN project_members.role IS '팀원 역할: pm(프로젝트 매니저), engineer(엔지니어), supervisor(감독자), worker(작업자), member(일반 멤버)';

-- =========================================
-- 3. GANTT_CHARTS 테이블 수정
-- =========================================
-- 기존 gantt_charts 테이블에 project_id 외래키 추가
-- (만약 테이블이 없으면 생성)

CREATE TABLE IF NOT EXISTS gantt_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,  -- 이미 존재할 수 있음
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,  -- ISO 8601 형식 문자열
  end_date TEXT,    -- ISO 8601 형식 문자열
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- project_id에 외래키 제약 조건 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_gantt_charts_project'
  ) THEN
    ALTER TABLE gantt_charts
    ADD CONSTRAINT fk_gantt_charts_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_gantt_charts_project_id ON gantt_charts(project_id);

-- updated_at 트리거 (없으면 추가)
CREATE OR REPLACE FUNCTION update_gantt_charts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gantt_charts_updated_at_trigger ON gantt_charts;

CREATE TRIGGER update_gantt_charts_updated_at_trigger
  BEFORE UPDATE ON gantt_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_gantt_charts_updated_at();

-- =========================================
-- 4. TASKS 테이블 확인
-- =========================================
-- 기존 tasks 테이블 확인 (없으면 생성)

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gantt_chart_id UUID NOT NULL REFERENCES gantt_charts(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'task' CHECK (type IN ('task', 'milestone', 'project', 'summary')),
  start_date TEXT NOT NULL,  -- ISO 8601 형식
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

CREATE INDEX IF NOT EXISTS idx_tasks_gantt_chart_id ON tasks(gantt_chart_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- =========================================
-- 5. LINKS 테이블 확인
-- =========================================
-- 기존 links 테이블 확인 (없으면 생성)

CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gantt_chart_id UUID NOT NULL REFERENCES gantt_charts(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  type TEXT DEFAULT 'e2s' CHECK (type IN ('e2s', 's2s', 'e2e', 's2e')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_gantt_chart_id ON links(gantt_chart_id);

-- =========================================
-- 6. ROW LEVEL SECURITY (RLS) 정책
-- =========================================

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- ==================
-- PROJECTS 정책
-- ==================

-- 모든 사람이 프로젝트 목록 조회 가능
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  USING (true);

-- 인증된 사용자는 프로젝트 생성 가능
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 프로젝트 생성자 또는 멤버는 프로젝트 수정 가능
DROP POLICY IF EXISTS "Project creators and members can update" ON projects;
CREATE POLICY "Project creators and members can update"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = projects.id AND role IN ('pm', 'engineer')
    )
  );

-- 프로젝트 생성자만 삭제 가능
DROP POLICY IF EXISTS "Project creators can delete" ON projects;
CREATE POLICY "Project creators can delete"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 관리자는 모든 프로젝트 수정/삭제 가능
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;
CREATE POLICY "Admins can manage all projects"
  ON projects FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================
-- PROJECT_MEMBERS 정책
-- ==================

-- 모든 사람이 프로젝트 멤버 조회 가능
DROP POLICY IF EXISTS "Anyone can view project members" ON project_members;
CREATE POLICY "Anyone can view project members"
  ON project_members FOR SELECT
  USING (true);

-- 프로젝트 생성자 또는 PM은 멤버 추가 가능
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
CREATE POLICY "Project owners can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = project_members.project_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_members.project_id AND role = 'pm'
    )
  );

-- 프로젝트 생성자 또는 PM은 멤버 제거 가능
DROP POLICY IF EXISTS "Project owners can remove members" ON project_members;
CREATE POLICY "Project owners can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = project_members.project_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_members.project_id AND role = 'pm'
    )
  );

-- 프로젝트 생성자 또는 PM은 멤버 역할 수정 가능
DROP POLICY IF EXISTS "Project owners can update member roles" ON project_members;
CREATE POLICY "Project owners can update member roles"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = project_members.project_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_members.project_id AND role = 'pm'
    )
  );

-- ==================
-- GANTT_CHARTS 정책
-- ==================

-- 프로젝트 멤버는 간트차트 조회 가능
DROP POLICY IF EXISTS "Project members can view gantt charts" ON gantt_charts;
CREATE POLICY "Project members can view gantt charts"
  ON gantt_charts FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = gantt_charts.project_id
    ) OR
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = gantt_charts.project_id
    )
  );

-- 프로젝트 멤버(PM/Engineer)는 간트차트 생성 가능
DROP POLICY IF EXISTS "Project members can create gantt charts" ON gantt_charts;
CREATE POLICY "Project members can create gantt charts"
  ON gantt_charts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = gantt_charts.project_id 
        AND role IN ('pm', 'engineer')
    ) OR
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = gantt_charts.project_id
    )
  );

-- 프로젝트 멤버(PM/Engineer)는 간트차트 수정 가능
DROP POLICY IF EXISTS "Project members can update gantt charts" ON gantt_charts;
CREATE POLICY "Project members can update gantt charts"
  ON gantt_charts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = gantt_charts.project_id 
        AND role IN ('pm', 'engineer')
    ) OR
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = gantt_charts.project_id
    )
  );

-- 프로젝트 생성자 또는 PM은 간트차트 삭제 가능
DROP POLICY IF EXISTS "Project owners can delete gantt charts" ON gantt_charts;
CREATE POLICY "Project owners can delete gantt charts"
  ON gantt_charts FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = gantt_charts.project_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = gantt_charts.project_id AND role = 'pm'
    )
  );

-- ==================
-- TASKS 정책
-- ==================

-- 프로젝트 멤버는 Task 조회 가능
DROP POLICY IF EXISTS "Project members can view tasks" ON tasks;
CREATE POLICY "Project members can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT pm.user_id FROM project_members pm
      JOIN gantt_charts gc ON pm.project_id = gc.project_id
      WHERE gc.id = tasks.gantt_chart_id
    ) OR
    auth.uid() IN (
      SELECT p.created_by FROM projects p
      JOIN gantt_charts gc ON p.id = gc.project_id
      WHERE gc.id = tasks.gantt_chart_id
    )
  );

-- 프로젝트 멤버는 Task 생성/수정 가능
DROP POLICY IF EXISTS "Project members can manage tasks" ON tasks;
CREATE POLICY "Project members can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT pm.user_id FROM project_members pm
      JOIN gantt_charts gc ON pm.project_id = gc.project_id
      WHERE gc.id = tasks.gantt_chart_id
    ) OR
    auth.uid() IN (
      SELECT p.created_by FROM projects p
      JOIN gantt_charts gc ON p.id = gc.project_id
      WHERE gc.id = tasks.gantt_chart_id
    )
  );

-- ==================
-- LINKS 정책
-- ==================

-- 프로젝트 멤버는 Link 조회 가능
DROP POLICY IF EXISTS "Project members can view links" ON links;
CREATE POLICY "Project members can view links"
  ON links FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT pm.user_id FROM project_members pm
      JOIN gantt_charts gc ON pm.project_id = gc.project_id
      WHERE gc.id = links.gantt_chart_id
    ) OR
    auth.uid() IN (
      SELECT p.created_by FROM projects p
      JOIN gantt_charts gc ON p.id = gc.project_id
      WHERE gc.id = links.gantt_chart_id
    )
  );

-- 프로젝트 멤버는 Link 생성/수정 가능
DROP POLICY IF EXISTS "Project members can manage links" ON links;
CREATE POLICY "Project members can manage links"
  ON links FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT pm.user_id FROM project_members pm
      JOIN gantt_charts gc ON pm.project_id = gc.project_id
      WHERE gc.id = links.gantt_chart_id
    ) OR
    auth.uid() IN (
      SELECT p.created_by FROM projects p
      JOIN gantt_charts gc ON p.id = gc.project_id
      WHERE gc.id = links.gantt_chart_id
    )
  );

-- =========================================
-- 7. 샘플 데이터 삽입
-- =========================================
-- POC 테스트를 위한 샘플 데이터

-- 샘플 프로젝트 1: 서울 오피스 빌딩
INSERT INTO projects (id, name, description, location, client, contract_amount, start_date, end_date, status, created_by)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '서울 강남 오피스 빌딩 신축',
  '지상 20층 규모의 오피스 빌딩 신축 공사',
  '서울특별시 강남구 테헤란로 123',
  '강남건설(주)',
  15000000000,
  '2024-01-01',
  '2025-12-31',
  'active',
  (SELECT id FROM profiles LIMIT 1)
) ON CONFLICT (id) DO NOTHING;

-- 샘플 프로젝트 2: 부산 아파트 단지
INSERT INTO projects (id, name, description, location, client, contract_amount, start_date, end_date, status, created_by)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  '부산 해운대 아파트 단지',
  '15개동 1,200세대 규모의 아파트 단지 건설',
  '부산광역시 해운대구 센텀동로 456',
  '해운대개발(주)',
  45000000000,
  '2024-03-01',
  '2026-06-30',
  'planning',
  (SELECT id FROM profiles LIMIT 1)
) ON CONFLICT (id) DO NOTHING;

-- 샘플 프로젝트 3: 인천 물류센터
INSERT INTO projects (id, name, description, location, client, contract_amount, start_date, end_date, status, created_by)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  '인천 첨단 물류센터',
  '스마트 물류 시스템이 적용된 대규모 물류센터',
  '인천광역시 연수구 송도국제도시 789',
  '글로벌물류(주)',
  8500000000,
  '2023-06-01',
  '2024-05-31',
  'completed',
  (SELECT id FROM profiles LIMIT 1)
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 완료!
-- =========================================

-- 테이블 목록 확인
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'project_members', 'gantt_charts', 'tasks', 'links')
ORDER BY tablename;

-- 생성된 프로젝트 확인
SELECT 
  id,
  name,
  status,
  location,
  to_char(contract_amount, 'FM999,999,999,999') as contract_amount_krw,
  start_date,
  end_date
FROM projects
ORDER BY created_at DESC;

