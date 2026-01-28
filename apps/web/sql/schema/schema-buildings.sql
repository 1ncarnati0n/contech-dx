-- ============================================
-- ConTech-DX Building Data Schema
-- 동(Building) 및 층별 공종 데이터 저장
-- ============================================
--
-- 실행 순서:
-- 1. schema-roles.sql 먼저 실행 (profiles 테이블 필요)
-- 2. schema-projects.sql 실행 (projects 테이블 필요)
-- 3. 이 파일 실행
--
-- 작성일: 2025-01-28
-- 버전: 1.0.0
-- ============================================

-- ============================================
-- 1. BUILDINGS 테이블
-- ============================================
-- 동(Building) 기본 정보 저장

CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- 동 기본 정보
    building_name TEXT NOT NULL,
    building_number INTEGER NOT NULL,

    -- 동 메타데이터 (JSONB로 복잡한 중첩 구조 저장)
    -- totalUnits, unitTypePattern, coreCount, coreType, slabType,
    -- floorCount { basement, ground, ph, coreGroundFloors, coreBasementFloors, ... },
    -- heights { basement2, basement1, standard, floor1~5, top, ph }
    meta JSONB NOT NULL DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_buildings_project ON buildings(project_id);
CREATE INDEX IF NOT EXISTS idx_buildings_number ON buildings(building_number);

-- 코멘트
COMMENT ON TABLE buildings IS '동(Building) 기본 정보';
COMMENT ON COLUMN buildings.meta IS '동 메타데이터: totalUnits, coreCount, floorCount, heights 등 (JSONB)';

-- ============================================
-- 2. FLOORS 테이블
-- ============================================
-- 층(Floor) 정보 저장

CREATE TABLE IF NOT EXISTS floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,

    -- 층 기본 정보
    floor_label TEXT NOT NULL,           -- "B2", "B1", "1F", "PH1" 등
    floor_number INTEGER NOT NULL,       -- 정렬용 (-2, -1, 1, 2, ...)
    level_type TEXT NOT NULL CHECK (level_type IN ('지하', '지상')),
    floor_class TEXT NOT NULL CHECK (floor_class IN ('지하층', '일반층', '셋팅층', '기준층', '최상층', 'PH층', '옥탑층')),
    height NUMERIC(10, 2),               -- 층고 (mm)

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_floors_number ON floors(floor_number);

-- 코멘트
COMMENT ON TABLE floors IS '층(Floor) 정보';
COMMENT ON COLUMN floors.floor_label IS '층 표시명: B2, B1, 1F, 2~10F 기준층, PH1 등';
COMMENT ON COLUMN floors.floor_class IS '층 분류: 지하층, 일반층, 셋팅층, 기준층, 최상층, PH층, 옥탑층';

-- ============================================
-- 3. FLOOR_TRADES 테이블
-- ============================================
-- 층별 공종 데이터 저장

CREATE TABLE IF NOT EXISTS floor_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,

    -- 공종 그룹
    trade_group TEXT NOT NULL,           -- '버림', '기초', '아파트' 등

    -- 공종별 데이터 (JSONB)
    -- gangForm, alForm, formwork, euroForm, stripClean, rebar, concrete
    -- 각 공종별로 areaM2, productivity, workers, cost, ton, volumeM3 등 포함
    trades JSONB NOT NULL DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 유니크 제약: 동일 층 + 동일 공종그룹은 하나만
    UNIQUE(floor_id, trade_group)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_floor_trades_floor ON floor_trades(floor_id);
CREATE INDEX IF NOT EXISTS idx_floor_trades_building ON floor_trades(building_id);
CREATE INDEX IF NOT EXISTS idx_floor_trades_group ON floor_trades(trade_group);

-- 코멘트
COMMENT ON TABLE floor_trades IS '층별 공종 데이터';
COMMENT ON COLUMN floor_trades.trade_group IS '공종 그룹: 버림, 기초, 아파트 등';
COMMENT ON COLUMN floor_trades.trades IS '공종별 데이터: gangForm, alForm, formwork, rebar, concrete 등 (JSONB)';

-- ============================================
-- 4. BUILDING_PROCESS_PLANS 테이블
-- ============================================
-- 동별 공정 계획 저장

CREATE TABLE IF NOT EXISTS building_process_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- 구분별 공정 정보 (JSONB)
    -- 카테고리별: 버림, 기초, 지하층, 셋팅층, 기준층, PH층, 옥탑층
    -- 각 카테고리: { days, processType, floors }
    processes JSONB NOT NULL DEFAULT '{}',

    -- 합계
    total_days INTEGER DEFAULT 0,

    -- 세부공정 순작업일 오버라이드 (JSONB)
    item_direct_work_days_overrides JSONB DEFAULT '{}',

    -- 가설/흙막이/토공사 공사일수 (지하층 전용)
    temporary_work_days INTEGER,
    earth_retention_work_days INTEGER,
    earthwork_work_days INTEGER,

    -- 특수 행 수량 (주차장, 3단 가시설 등)
    special_row_quantities JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 유니크 제약: 동당 하나의 공정 계획
    UNIQUE(building_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_building_process_plans_building ON building_process_plans(building_id);
CREATE INDEX IF NOT EXISTS idx_building_process_plans_project ON building_process_plans(project_id);

-- 코멘트
COMMENT ON TABLE building_process_plans IS '동별 공정 계획';
COMMENT ON COLUMN building_process_plans.processes IS '구분별 공정 정보: 버림, 기초, 지하층, 셋팅층, 기준층, PH층, 옥탑층 (JSONB)';

-- ============================================
-- 5. POURING_SECTIONS 테이블
-- ============================================
-- 타설 구간 정보 저장

CREATE TABLE IF NOT EXISTS pouring_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- 타설 구간 정보
    label TEXT NOT NULL,                 -- 'A', 'B', 'C' 등
    concrete_volume NUMERIC(15, 2),      -- 콘크리트 물량 (M3)
    equipment_count INTEGER,             -- 장비 대수

    -- 추가 정보
    process_days INTEGER,                -- 공정 일수
    is_passage BOOLEAN DEFAULT FALSE,    -- 통로부분 여부
    includes_ground_floor BOOLEAN DEFAULT FALSE,  -- 지상층 주동 포함 여부
    includes_facility3 BOOLEAN DEFAULT FALSE,     -- 3단 가시설 적용부분 포함 여부

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pouring_sections_project ON pouring_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_pouring_sections_label ON pouring_sections(label);

-- 코멘트
COMMENT ON TABLE pouring_sections IS '타설 구간 정보';
COMMENT ON COLUMN pouring_sections.label IS '구간 라벨: A, B, C 등';

-- ============================================
-- 6. updated_at 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_buildings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Buildings
DROP TRIGGER IF EXISTS buildings_updated_at ON buildings;
CREATE TRIGGER buildings_updated_at
    BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_buildings_updated_at();

-- Floors
DROP TRIGGER IF EXISTS floors_updated_at ON floors;
CREATE TRIGGER floors_updated_at
    BEFORE UPDATE ON floors
    FOR EACH ROW EXECUTE FUNCTION update_buildings_updated_at();

-- Floor Trades
DROP TRIGGER IF EXISTS floor_trades_updated_at ON floor_trades;
CREATE TRIGGER floor_trades_updated_at
    BEFORE UPDATE ON floor_trades
    FOR EACH ROW EXECUTE FUNCTION update_buildings_updated_at();

-- Building Process Plans
DROP TRIGGER IF EXISTS building_process_plans_updated_at ON building_process_plans;
CREATE TRIGGER building_process_plans_updated_at
    BEFORE UPDATE ON building_process_plans
    FOR EACH ROW EXECUTE FUNCTION update_buildings_updated_at();

-- Pouring Sections
DROP TRIGGER IF EXISTS pouring_sections_updated_at ON pouring_sections;
CREATE TRIGGER pouring_sections_updated_at
    BEFORE UPDATE ON pouring_sections
    FOR EACH ROW EXECUTE FUNCTION update_buildings_updated_at();

-- ============================================
-- 7. RLS (Row Level Security)
-- ============================================

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_process_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pouring_sections ENABLE ROW LEVEL SECURITY;

-- ==================
-- BUILDINGS 정책
-- ==================

-- 프로젝트 생성자 또는 멤버가 접근 가능
DROP POLICY IF EXISTS "Users can access their project buildings" ON buildings;
CREATE POLICY "Users can access their project buildings"
    ON buildings FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

-- Admin은 모든 데이터 접근 가능
DROP POLICY IF EXISTS "Admins can access all buildings" ON buildings;
CREATE POLICY "Admins can access all buildings"
    ON buildings FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- ==================
-- FLOORS 정책
-- ==================

DROP POLICY IF EXISTS "Users can access their project floors" ON floors;
CREATE POLICY "Users can access their project floors"
    ON floors FOR ALL
    USING (
        building_id IN (
            SELECT id FROM buildings WHERE project_id IN (
                SELECT id FROM projects WHERE created_by = auth.uid()
            )
        )
        OR
        building_id IN (
            SELECT id FROM buildings WHERE project_id IN (
                SELECT project_id FROM project_members WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Admins can access all floors" ON floors;
CREATE POLICY "Admins can access all floors"
    ON floors FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- ==================
-- FLOOR_TRADES 정책
-- ==================

DROP POLICY IF EXISTS "Users can access their project floor trades" ON floor_trades;
CREATE POLICY "Users can access their project floor trades"
    ON floor_trades FOR ALL
    USING (
        building_id IN (
            SELECT id FROM buildings WHERE project_id IN (
                SELECT id FROM projects WHERE created_by = auth.uid()
            )
        )
        OR
        building_id IN (
            SELECT id FROM buildings WHERE project_id IN (
                SELECT project_id FROM project_members WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Admins can access all floor trades" ON floor_trades;
CREATE POLICY "Admins can access all floor trades"
    ON floor_trades FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- ==================
-- BUILDING_PROCESS_PLANS 정책
-- ==================

DROP POLICY IF EXISTS "Users can access their project process plans" ON building_process_plans;
CREATE POLICY "Users can access their project process plans"
    ON building_process_plans FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can access all process plans" ON building_process_plans;
CREATE POLICY "Admins can access all process plans"
    ON building_process_plans FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- ==================
-- POURING_SECTIONS 정책
-- ==================

DROP POLICY IF EXISTS "Users can access their project pouring sections" ON pouring_sections;
CREATE POLICY "Users can access their project pouring sections"
    ON pouring_sections FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can access all pouring sections" ON pouring_sections;
CREATE POLICY "Admins can access all pouring sections"
    ON pouring_sections FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- ============================================
-- 완료!
-- ============================================
-- 테이블 확인 쿼리:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('buildings', 'floors', 'floor_trades', 'building_process_plans', 'pouring_sections');
