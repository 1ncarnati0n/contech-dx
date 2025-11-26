-- =========================================
-- 날짜 타입 문제 해결
-- =========================================
-- 
-- 문제: Supabase는 DATE 타입이지만, 애플리케이션은 TEXT (문자열) 사용
-- 해결: DATE → TEXT로 변경하여 일관성 확보
--
-- 실행: Supabase SQL Editor
-- 작성일: 2025-11-25
--
-- =========================================

-- 1. projects 테이블의 start_date, end_date를 TEXT로 변경
ALTER TABLE projects 
  ALTER COLUMN start_date TYPE TEXT;

ALTER TABLE projects 
  ALTER COLUMN end_date TYPE TEXT;

-- 2. gantt_charts 테이블도 동일하게 변경
ALTER TABLE gantt_charts 
  ALTER COLUMN start_date TYPE TEXT;

ALTER TABLE gantt_charts 
  ALTER COLUMN end_date TYPE TEXT;

-- 3. 확인 쿼리
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns
WHERE table_name IN ('projects', 'gantt_charts')
  AND column_name IN ('start_date', 'end_date')
ORDER BY table_name, column_name;

-- 예상 결과:
-- table_name    | column_name | data_type
-- --------------+-------------+-----------
-- gantt_charts  | end_date    | text
-- gantt_charts  | start_date  | text
-- projects      | end_date    | text
-- projects      | start_date  | text

-- =========================================
-- 완료!
-- =========================================




