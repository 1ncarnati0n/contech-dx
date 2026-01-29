-- ============================================
-- SA-Gantt Supabase Schema
-- 프로젝트별 간트 차트 데이터 저장
-- ============================================
--
-- 실행 순서:
-- 1. schema-roles.sql 먼저 실행 (profiles 테이블 필요)
-- 2. schema-projects.sql 실행 (projects 테이블 필요)
-- 3. 이 파일 실행
--
-- 작성일: 2025-01-26
-- 버전: 2.0.0 (sa-gantt-lib 전용 구조)
-- ============================================

-- ============================================
-- 1. GANTT_TASKS 테이블
-- ============================================
-- SA-Gantt 라이브러리 전용 태스크 테이블
-- GROUP/CP/TASK 계층 구조를 wbs_level + type으로 표현

CREATE TABLE IF NOT EXISTS gantt_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- 계층 구조
    parent_id UUID REFERENCES gantt_tasks(id) ON DELETE CASCADE,
    wbs_level SMALLINT NOT NULL CHECK (wbs_level IN (1, 2)),
    type TEXT NOT NULL CHECK (type IN ('GROUP', 'CP', 'TASK')),
    name TEXT NOT NULL,

    -- 날짜
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Level별 데이터 (JSONB로 유연하게 저장)
    cp_data JSONB,      -- { workDaysTotal, nonWorkDaysTotal }
    task_data JSONB,    -- { netWorkDays, indirectWorkDaysPre, indirectWorkDaysPost }
    group_data JSONB,   -- { progress }

    -- 기존 종속성 (하위호환)
    dependencies JSONB DEFAULT '[]',

    -- UI 상태
    is_expanded BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_gantt_tasks_project ON gantt_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_gantt_tasks_parent ON gantt_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_gantt_tasks_type ON gantt_tasks(type);

-- 코멘트
COMMENT ON TABLE gantt_tasks IS 'SA-Gantt 태스크 (GROUP/CP/TASK 계층 구조)';
COMMENT ON COLUMN gantt_tasks.wbs_level IS 'WBS 레벨: 1(상위), 2(하위)';
COMMENT ON COLUMN gantt_tasks.type IS '태스크 유형: GROUP(그룹), CP(공정), TASK(작업)';
COMMENT ON COLUMN gantt_tasks.cp_data IS 'CP 레벨 데이터: { workDaysTotal, nonWorkDaysTotal }';
COMMENT ON COLUMN gantt_tasks.task_data IS 'TASK 레벨 데이터: { netWorkDays, indirectWorkDaysPre, indirectWorkDaysPost }';

-- ============================================
-- 2. GANTT_MILESTONES 테이블
-- ============================================
-- 프로젝트 마일스톤 (MASTER/DETAIL 구분)

CREATE TABLE IF NOT EXISTS gantt_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    milestone_type TEXT DEFAULT 'MASTER' CHECK (milestone_type IN ('MASTER', 'DETAIL')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_gantt_milestones_project ON gantt_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_gantt_milestones_date ON gantt_milestones(date);

-- 코멘트
COMMENT ON TABLE gantt_milestones IS 'SA-Gantt 마일스톤 (MASTER/DETAIL)';
COMMENT ON COLUMN gantt_milestones.milestone_type IS '마일스톤 유형: MASTER(주요), DETAIL(세부)';

-- ============================================
-- 3. GANTT_DEPENDENCIES 테이블
-- ============================================
-- 앵커 기반 종속성 (소수점 day_index 지원)

CREATE TABLE IF NOT EXISTS gantt_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    source_task_id UUID NOT NULL REFERENCES gantt_tasks(id) ON DELETE CASCADE,
    target_task_id UUID NOT NULL REFERENCES gantt_tasks(id) ON DELETE CASCADE,
    source_day_index NUMERIC NOT NULL,  -- 소수점 지원 (0.5 단위)
    target_day_index NUMERIC NOT NULL,
    lag INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_gantt_dependencies_project ON gantt_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_gantt_dependencies_source ON gantt_dependencies(source_task_id);
CREATE INDEX IF NOT EXISTS idx_gantt_dependencies_target ON gantt_dependencies(target_task_id);

-- 코멘트
COMMENT ON TABLE gantt_dependencies IS 'SA-Gantt 앵커 종속성 (소수점 day_index 지원)';
COMMENT ON COLUMN gantt_dependencies.source_day_index IS '소스 태스크의 앵커 위치 (0.5 단위)';
COMMENT ON COLUMN gantt_dependencies.target_day_index IS '타겟 태스크의 앵커 위치 (0.5 단위)';
COMMENT ON COLUMN gantt_dependencies.lag IS '지연 일수 (음수 가능)';

-- ============================================
-- 4. updated_at 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_gantt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gantt_tasks_updated_at ON gantt_tasks;
CREATE TRIGGER gantt_tasks_updated_at
    BEFORE UPDATE ON gantt_tasks
    FOR EACH ROW EXECUTE FUNCTION update_gantt_updated_at();

DROP TRIGGER IF EXISTS gantt_milestones_updated_at ON gantt_milestones;
CREATE TRIGGER gantt_milestones_updated_at
    BEFORE UPDATE ON gantt_milestones
    FOR EACH ROW EXECUTE FUNCTION update_gantt_updated_at();

-- ============================================
-- 5. RLS (Row Level Security)
-- ============================================

ALTER TABLE gantt_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_dependencies ENABLE ROW LEVEL SECURITY;

-- 프로젝트 소유자 또는 멤버 접근 가능
-- NOTE: WITH CHECK 절이 있어야 INSERT/UPDATE가 가능함
DROP POLICY IF EXISTS "Users can access their project tasks" ON gantt_tasks;
CREATE POLICY "Users can access their project tasks"
    ON gantt_tasks FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can access their project milestones" ON gantt_milestones;
CREATE POLICY "Users can access their project milestones"
    ON gantt_milestones FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can access their project dependencies" ON gantt_dependencies;
CREATE POLICY "Users can access their project dependencies"
    ON gantt_dependencies FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 5.1 관리자(Admin) 전체 접근 정책
-- ============================================
-- admin 역할 사용자는 모든 gantt 데이터에 접근 가능

DROP POLICY IF EXISTS "Admins can access all gantt tasks" ON gantt_tasks;
CREATE POLICY "Admins can access all gantt tasks"
    ON gantt_tasks FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Admins can access all gantt milestones" ON gantt_milestones;
CREATE POLICY "Admins can access all gantt milestones"
    ON gantt_milestones FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Admins can access all gantt dependencies" ON gantt_dependencies;
CREATE POLICY "Admins can access all gantt dependencies"
    ON gantt_dependencies FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- ============================================
-- 완료!
-- ============================================
-- 테이블 확인 쿼리:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename LIKE 'gantt_%';
