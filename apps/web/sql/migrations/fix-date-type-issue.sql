-- =========================================
-- 날짜 타입 문제 해결 (Projects 테이블)
-- =========================================
--
-- 문제: Supabase는 DATE 타입이지만, 일부 애플리케이션 코드에서 TEXT 사용
-- 해결: DATE → TEXT로 변경하여 일관성 확보
--
-- 참고: SA-Gantt 테이블(gantt_tasks, gantt_milestones)은 DATE 타입 유지
--       (schema-gantt.sql 참조)
--
-- 실행: 필요시에만 Supabase SQL Editor에서 실행
-- 작성일: 2025-01-26
-- 버전: 2.0.0
--
-- =========================================

-- 1. projects 테이블의 start_date, end_date를 TEXT로 변경
-- 주의: 기존 DATE 데이터가 있으면 자동 변환됨
ALTER TABLE projects
  ALTER COLUMN start_date TYPE TEXT;

ALTER TABLE projects
  ALTER COLUMN end_date TYPE TEXT;

-- 2. 확인 쿼리
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('start_date', 'end_date')
ORDER BY column_name;

-- 예상 결과:
-- table_name | column_name | data_type
-- -----------+-------------+-----------
-- projects   | end_date    | text
-- projects   | start_date  | text

-- =========================================
-- 완료!
-- =========================================
