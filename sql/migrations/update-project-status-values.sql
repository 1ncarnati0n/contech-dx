-- =========================================
-- 프로젝트 상태 값 업데이트 마이그레이션
-- =========================================
-- 기존 상태 값: planning, active, completed, on_hold, cancelled, dummy
-- 새로운 상태 값: announcement, bidding, award, construction_start, completion
-- 
-- 실행 순서:
-- 1. 이 파일을 Supabase SQL Editor에서 실행
-- 
-- 작성일: 2025-01-XX
-- 버전: 1.0.0
-- =========================================

-- 1. 기존 CHECK 제약 조건 제거
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. 새로운 CHECK 제약 조건 추가 (새로운 상태 값들)
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('announcement', 'bidding', 'award', 'construction_start', 'completion'));

-- 3. 기본값 업데이트
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'announcement';

-- 4. 기존 데이터 마이그레이션 (선택사항 - 필요시 수동으로 수행)
-- 기존 상태를 새로운 상태로 매핑:
-- planning -> announcement
-- active -> construction_start
-- completed -> completion
-- on_hold -> bidding (또는 적절한 값으로 변경)
-- cancelled -> (삭제하거나 적절한 값으로 변경)
-- dummy -> (삭제하거나 적절한 값으로 변경)

-- UPDATE projects SET status = 'announcement' WHERE status = 'planning';
-- UPDATE projects SET status = 'construction_start' WHERE status = 'active';
-- UPDATE projects SET status = 'completion' WHERE status = 'completed';
-- UPDATE projects SET status = 'bidding' WHERE status = 'on_hold';
-- DELETE FROM projects WHERE status IN ('cancelled', 'dummy');

-- 5. 확인 쿼리
SELECT 
  conname AS constraint_name, 
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
  AND conname = 'projects_status_check';

-- 6. 코멘트 업데이트
COMMENT ON COLUMN projects.status IS '프로젝트 상태: announcement(공모), bidding(입찰), award(수주), construction_start(착공), completion(준공)';

