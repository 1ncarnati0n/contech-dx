-- =========================================
-- 기존 테이블 정리 및 재생성
-- =========================================
-- 
-- 목적: 구버전 테이블을 삭제하고 새 스키마로 재생성
-- 주의: 기존 데이터가 모두 삭제됩니다!
--
-- 실행 순서:
-- 1. 이 파일 실행 (테이블 삭제)
-- 2. schema-projects.sql 실행 (테이블 생성)
-- 3. seed-construction-sample.sql 실행 (샘플 데이터)
--
-- =========================================

-- =========================================
-- 1. 기존 테이블 삭제 (역순)
-- =========================================

-- 외래 키 종속성을 고려하여 역순으로 삭제

DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS gantt_charts CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- =========================================
-- 2. 트리거 함수 삭제 (선택 사항)
-- =========================================a

DROP FUNCTION IF EXISTS update_projects_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_project_members_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_gantt_charts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_tasks_updated_at() CASCADE;

-- =========================================
-- 완료!
-- =========================================
-- 
-- 다음 단계:
-- 1. schema-projects.sql 실행
-- 2. seed-construction-sample.sql 실행
--
-- =========================================

-- 확인 쿼리: 테이블 목록 조회
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'project_members', 'gantt_charts', 'tasks', 'links')
ORDER BY tablename;

