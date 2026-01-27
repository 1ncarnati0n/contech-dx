-- =========================================
-- ConTech-DX 프로젝트 관리 시스템 스키마
-- =========================================
-- 건축 직영공사 프로젝트 관리를 위한 데이터베이스 스키마
--
-- 실행 순서:
-- 1. schema-roles.sql 먼저 실행 (profiles 테이블 필요)
-- 2. 이 파일 실행
-- 3. schema-gantt.sql 실행 (Gantt 차트 관련)
--
-- 작성일: 2025-01-26
-- 버전: 2.0.0 (SA-Gantt 통합)
-- =========================================

-- =========================================
-- 1. PROJECTS 테이블
-- =========================================
-- 건축 직영공사 프로젝트 정보를 저장합니다.

-- 프로젝트 번호 시퀀스 (URL용 짧은 ID)
CREATE SEQUENCE IF NOT EXISTS project_number_seq;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- URL용 짧은 ID (1, 2, 3...)
  project_number INTEGER UNIQUE DEFAULT nextval('project_number_seq'),

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

  -- 상태: announcement(공모), bidding(입찰), award(수주), construction_start(착공), completion(준공)
  status TEXT DEFAULT 'announcement' CHECK (status IN ('announcement', 'bidding', 'award', 'construction_start', 'completion')),

  -- 메타 정보
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_projects_project_number ON projects(project_number);
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
COMMENT ON COLUMN projects.project_number IS 'URL용 짧은 ID (1, 2, 3...)';
COMMENT ON COLUMN projects.name IS '프로젝트명';
COMMENT ON COLUMN projects.location IS '공사 위치 (주소)';
COMMENT ON COLUMN projects.client IS '발주처/클라이언트명';
COMMENT ON COLUMN projects.contract_amount IS '계약금액 (원)';
COMMENT ON COLUMN projects.status IS '프로젝트 상태: announcement(공모), bidding(입찰), award(수주), construction_start(착공), completion(준공)';

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
-- 3. ROW LEVEL SECURITY (RLS) 정책
-- =========================================

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

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

-- =========================================
-- 완료!
-- =========================================
-- 다음 단계: schema-gantt.sql 실행
-- =========================================
