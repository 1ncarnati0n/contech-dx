-- =========================================
-- Dummy 상태 추가를 위한 스키마 업데이트
-- =========================================
--
-- 실행: Supabase SQL Editor
-- 작성일: 2025-11-25
--
-- =========================================

-- Projects 테이블의 status CHECK 제약 조건 업데이트
-- 기존: 'planning', 'active', 'completed', 'on_hold', 'cancelled'
-- 추가: 'dummy'

-- 1. 기존 CHECK 제약 조건 제거
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. 새로운 CHECK 제약 조건 추가 (dummy 포함)
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('planning', 'active', 'completed', 'on_hold', 'cancelled', 'dummy'));

-- 3. 확인 쿼리
SELECT 
  conname AS constraint_name, 
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
  AND conname = 'projects_status_check';

-- 예상 결과:
-- constraint_name: projects_status_check
-- constraint_definition: CHECK ((status IN ('planning', 'active', 'completed', 'on_hold', 'cancelled', 'dummy')))

-- =========================================
-- 완료!
-- =========================================

