-- ============================================
-- Migration: Anchor Dependencies → Group Dependencies
-- SA-Gantt GROUP 바 기반 FS 종속성으로 전환
-- ============================================
--
-- 변경 사항:
-- 1. source_task_id → source_group_id (컬럼명 변경)
-- 2. target_task_id → target_group_id (컬럼명 변경)
-- 3. source_day_index, target_day_index 제거
-- 4. type 컬럼 추가 ('FS' 기본값)
--
-- 주의: 기존 Anchor 종속성 데이터는 삭제됩니다.
--       필요시 백업 후 실행하세요.
--
-- 작성일: 2025-01-30
-- 버전: 3.0.0 (GroupDependency 전용 구조)
-- ============================================

-- ============================================
-- 1. 기존 데이터 백업 (선택적)
-- ============================================
-- 필요시 아래 주석 해제하여 백업 테이블 생성
-- CREATE TABLE IF NOT EXISTS gantt_dependencies_backup AS
-- SELECT * FROM gantt_dependencies;

-- ============================================
-- 2. 기존 데이터 삭제
-- ============================================
-- Anchor 기반 종속성은 Group 기반으로 직접 변환할 수 없으므로
-- 기존 데이터를 삭제하고 새로 시작합니다.
TRUNCATE TABLE gantt_dependencies;

-- ============================================
-- 3. 컬럼 이름 변경
-- ============================================
-- source_task_id → source_group_id
ALTER TABLE gantt_dependencies
    RENAME COLUMN source_task_id TO source_group_id;

-- target_task_id → target_group_id
ALTER TABLE gantt_dependencies
    RENAME COLUMN target_task_id TO target_group_id;

-- ============================================
-- 4. 불필요 컬럼 제거
-- ============================================
-- Anchor 기반 day_index 컬럼 제거
ALTER TABLE gantt_dependencies
    DROP COLUMN IF EXISTS source_day_index;

ALTER TABLE gantt_dependencies
    DROP COLUMN IF EXISTS target_day_index;

-- ============================================
-- 5. type 컬럼 추가
-- ============================================
-- FS (Finish-to-Start) 연결 타입
ALTER TABLE gantt_dependencies
    ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'FS';

-- ============================================
-- 6. 인덱스 이름 변경 (선택적)
-- ============================================
-- 인덱스 삭제 후 재생성 (이름 변경을 위해)
DROP INDEX IF EXISTS idx_gantt_dependencies_source;
DROP INDEX IF EXISTS idx_gantt_dependencies_target;

CREATE INDEX IF NOT EXISTS idx_gantt_deps_source_group ON gantt_dependencies(source_group_id);
CREATE INDEX IF NOT EXISTS idx_gantt_deps_target_group ON gantt_dependencies(target_group_id);

-- ============================================
-- 7. 코멘트 업데이트
-- ============================================
COMMENT ON TABLE gantt_dependencies IS 'SA-Gantt GROUP 바 종속성 (FS: Finish-to-Start)';
COMMENT ON COLUMN gantt_dependencies.source_group_id IS '선행 GROUP ID (바 끝점에서 연결 시작)';
COMMENT ON COLUMN gantt_dependencies.target_group_id IS '후행 GROUP ID (바 시작점으로 연결 완료)';
COMMENT ON COLUMN gantt_dependencies.type IS '종속성 타입 (현재 FS만 지원)';
COMMENT ON COLUMN gantt_dependencies.lag IS '지연 일수 (음수 가능)';

-- ============================================
-- 8. 제약조건 추가 (선택적)
-- ============================================
-- 자기 자신에게 연결 방지
ALTER TABLE gantt_dependencies
    DROP CONSTRAINT IF EXISTS gantt_dependencies_no_self_reference;

ALTER TABLE gantt_dependencies
    ADD CONSTRAINT gantt_dependencies_no_self_reference
    CHECK (source_group_id != target_group_id);

-- type 값 제약조건
ALTER TABLE gantt_dependencies
    DROP CONSTRAINT IF EXISTS gantt_dependencies_type_check;

ALTER TABLE gantt_dependencies
    ADD CONSTRAINT gantt_dependencies_type_check
    CHECK (type IN ('FS'));

-- 중복 종속성 방지 (unique constraint)
ALTER TABLE gantt_dependencies
    DROP CONSTRAINT IF EXISTS gantt_dependencies_unique;

ALTER TABLE gantt_dependencies
    ADD CONSTRAINT gantt_dependencies_unique
    UNIQUE (project_id, source_group_id, target_group_id);

-- ============================================
-- 완료!
-- ============================================
-- 마이그레이션 확인 쿼리:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'gantt_dependencies';
--
-- 예상 결과:
-- id, uuid
-- project_id, uuid
-- source_group_id, uuid
-- target_group_id, uuid
-- lag, integer
-- type, character varying
-- created_at, timestamp with time zone
-- ============================================
