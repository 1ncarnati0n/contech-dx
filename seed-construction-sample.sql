-- =========================================
-- 골조공사 샘플 데이터
-- =========================================
-- CP 지하골조 (벽체+슬래브) 공정 데이터
-- public/mock.json 기반
--
-- 실행 순서:
-- 1. schema-projects.sql 먼저 실행 필요
-- 2. 이 파일 실행
--
-- 작성일: 2025-11-25
-- =========================================

-- =========================================
-- 1. 샘플 프로젝트: 골조공사
-- =========================================

INSERT INTO projects (
  id,
  name,
  description,
  location,
  client,
  contract_amount,
  start_date,
  end_date,
  status,
  created_by
) VALUES (
  'a0000000-0000-0000-0000-000000000100',
  '서울 강남 오피스 빌딩 신축 - 지하 골조공사',
  'CP 지하골조 (벽체+슬래브) 공정 - 벽체(유로폼) 및 슬래브(합판거푸집) 시공',
  '서울특별시 강남구 테헤란로 123',
  '강남건설(주)',
  2500000000, -- 25억
  '2025-11-04',
  '2025-11-24',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 2. Gantt 차트
-- =========================================

INSERT INTO gantt_charts (
  id,
  project_id,
  name,
  description,
  start_date,
  end_date
) VALUES (
  'b0000000-0000-0000-0000-000000000100',
  'a0000000-0000-0000-0000-000000000100',
  'CP 지하골조 공정표',
  '벽체(유로폼) 및 슬래브(합판거푸집) 상세 공정',
  '2025-11-04',
  '2025-11-24'
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 3. Tasks (18개)
-- =========================================
-- public/mock.json 기반, 계층 구조 유지

-- Task 1: CP 지하골조 (최상위 summary)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000101',
  'b0000000-0000-0000-0000-000000000100',
  'CP 지하골조(벽체+슬래브)',
  'summary',
  '2025-11-04',
  '2025-11-24',
  52,
  NULL,
  1,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 2: 벽체(유로폼) - summary
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000102',
  'b0000000-0000-0000-0000-000000000100',
  '벽체(유로폼)',
  'summary',
  '2025-11-04',
  '2025-11-14',
  86,
  'c0000000-0000-0000-0000-000000000101',
  2,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 3: 철근 현장조립 (벽체)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000103',
  'b0000000-0000-0000-0000-000000000100',
  '철근 현장조립',
  'task',
  '2025-11-04',
  '2025-11-07',
  100,
  'c0000000-0000-0000-0000-000000000102',
  3,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 4: 철근 현장조립 (urgent - 하위)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000104',
  'b0000000-0000-0000-0000-000000000100',
  '철근 현장조립',
  'task',
  '2025-11-07',
  '2025-11-08',
  100,
  'c0000000-0000-0000-0000-000000000103',
  4,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 5: 검측 (철근)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000105',
  'b0000000-0000-0000-0000-000000000100',
  '검측',
  'task',
  '2025-11-08',
  '2025-11-09',
  56,
  'c0000000-0000-0000-0000-000000000103',
  5,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 6: 유로폼 설치
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000106',
  'b0000000-0000-0000-0000-000000000100',
  '유로폼 설치',
  'task',
  '2025-11-07',
  '2025-11-12',
  100,
  'c0000000-0000-0000-0000-000000000102',
  6,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 7: 유로폼 보강
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000107',
  'b0000000-0000-0000-0000-000000000100',
  '유로폼 보강',
  'task',
  '2025-11-12',
  '2025-11-13',
  72,
  'c0000000-0000-0000-0000-000000000106',
  7,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 8: 검측 (유로폼)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000108',
  'b0000000-0000-0000-0000-000000000100',
  '검측',
  'task',
  '2025-11-13',
  '2025-11-14',
  0,
  'c0000000-0000-0000-0000-000000000107',
  8,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 9: 슬래브(합판거푸집) - summary
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000109',
  'b0000000-0000-0000-0000-000000000100',
  '슬래브(합판거푸집)',
  'summary',
  '2025-11-10',
  '2025-11-24',
  30,
  'c0000000-0000-0000-0000-000000000101',
  9,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 10: 강관동바리 설치 및 해체
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000110',
  'b0000000-0000-0000-0000-000000000100',
  '강관동바리 설치 및 해체',
  'task',
  '2025-11-10',
  '2025-11-14',
  86,
  'c0000000-0000-0000-0000-000000000109',
  10,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 11: 합판거푸집 설치
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000111',
  'b0000000-0000-0000-0000-000000000100',
  '합판거푸집 설치',
  'task',
  '2025-11-12',
  '2025-11-14',
  72,
  'c0000000-0000-0000-0000-000000000109',
  11,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 12: 보강 검측
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000112',
  'b0000000-0000-0000-0000-000000000100',
  '보강 검측',
  'task',
  '2025-11-14',
  '2025-11-15',
  0,
  'c0000000-0000-0000-0000-000000000111',
  12,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 13: 철근 현장조립 (슬래브)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000113',
  'b0000000-0000-0000-0000-000000000100',
  '철근 현장조립',
  'task',
  '2025-11-14',
  '2025-11-17',
  0,
  'c0000000-0000-0000-0000-000000000109',
  13,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 14: 철근 현장조립 (urgent - 슬래브 하위)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000114',
  'b0000000-0000-0000-0000-000000000100',
  '철근 현장조립',
  'task',
  '2025-11-13',
  '2025-11-14',
  44,
  'c0000000-0000-0000-0000-000000000113',
  14,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 15: 검측 (슬래브 철근)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000115',
  'b0000000-0000-0000-0000-000000000100',
  '검측',
  'milestone',
  '2025-11-17',
  '2025-11-18',
  0,
  'c0000000-0000-0000-0000-000000000113',
  15,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 16: 콘크리트 펌프차 타설
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000116',
  'b0000000-0000-0000-0000-000000000100',
  '콘크리트 펌프차 타설',
  'task',
  '2025-11-18',
  '2025-11-19',
  0,
  'c0000000-0000-0000-0000-000000000109',
  16,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 17: 양생
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000117',
  'b0000000-0000-0000-0000-000000000100',
  '양생',
  'task',
  '2025-11-19',
  '2025-11-24',
  0,
  'c0000000-0000-0000-0000-000000000116',
  17,
  true
) ON CONFLICT (id) DO NOTHING;

-- Task 18: 주 공정 검측 (milestone)
INSERT INTO tasks (
  id,
  gantt_chart_id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id,
  position,
  open
) VALUES (
  'c0000000-0000-0000-0000-000000000118',
  'b0000000-0000-0000-0000-000000000100',
  '주 공정 검측',
  'milestone',
  '2025-11-24',
  '2025-11-24',
  0,
  'c0000000-0000-0000-0000-000000000101',
  18,
  true
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 4. Links (5개) - 주요 의존성만
-- =========================================

-- Link 1: 철근 현장조립 → 유로폼 설치
INSERT INTO links (
  id,
  gantt_chart_id,
  source,
  target,
  type
) VALUES (
  'd0000000-0000-0000-0000-000000000101',
  'b0000000-0000-0000-0000-000000000100',
  'c0000000-0000-0000-0000-000000000103',
  'c0000000-0000-0000-0000-000000000106',
  'e2s'
) ON CONFLICT (id) DO NOTHING;

-- Link 2: 유로폼 설치 → 합판거푸집 설치
INSERT INTO links (
  id,
  gantt_chart_id,
  source,
  target,
  type
) VALUES (
  'd0000000-0000-0000-0000-000000000102',
  'b0000000-0000-0000-0000-000000000100',
  'c0000000-0000-0000-0000-000000000106',
  'c0000000-0000-0000-0000-000000000111',
  'e2s'
) ON CONFLICT (id) DO NOTHING;

-- Link 3: 합판거푸집 설치 → 철근 현장조립(슬래브)
INSERT INTO links (
  id,
  gantt_chart_id,
  source,
  target,
  type
) VALUES (
  'd0000000-0000-0000-0000-000000000103',
  'b0000000-0000-0000-0000-000000000100',
  'c0000000-0000-0000-0000-000000000111',
  'c0000000-0000-0000-0000-000000000113',
  'e2s'
) ON CONFLICT (id) DO NOTHING;

-- Link 4: 철근 현장조립(슬래브) → 검측
INSERT INTO links (
  id,
  gantt_chart_id,
  source,
  target,
  type
) VALUES (
  'd0000000-0000-0000-0000-000000000104',
  'b0000000-0000-0000-0000-000000000100',
  'c0000000-0000-0000-0000-000000000113',
  'c0000000-0000-0000-0000-000000000115',
  'e2s'
) ON CONFLICT (id) DO NOTHING;

-- Link 5: 검측 → 콘크리트 타설
INSERT INTO links (
  id,
  gantt_chart_id,
  source,
  target,
  type
) VALUES (
  'd0000000-0000-0000-0000-000000000105',
  'b0000000-0000-0000-0000-000000000100',
  'c0000000-0000-0000-0000-000000000115',
  'c0000000-0000-0000-0000-000000000116',
  'e2s'
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 5. 확인 쿼리
-- =========================================

-- 프로젝트 확인
SELECT 
  id,
  name,
  status,
  location,
  to_char(contract_amount, 'FM999,999,999,999원') as contract_amount
FROM projects
WHERE id = 'a0000000-0000-0000-0000-000000000100';

-- Gantt 차트 확인
SELECT 
  id,
  project_id,
  name,
  description
FROM gantt_charts
WHERE project_id = 'a0000000-0000-0000-0000-000000000100';

-- Tasks 개수 확인
SELECT 
  COUNT(*) as task_count,
  type,
  AVG(progress) as avg_progress
FROM tasks
WHERE gantt_chart_id = 'b0000000-0000-0000-0000-000000000100'
GROUP BY type
ORDER BY type;

-- Links 개수 확인
SELECT COUNT(*) as link_count
FROM links
WHERE gantt_chart_id = 'b0000000-0000-0000-0000-000000000100';

-- 계층 구조 확인 (최상위 Task만)
SELECT 
  id,
  text,
  type,
  start_date,
  end_date,
  progress,
  parent_id
FROM tasks
WHERE gantt_chart_id = 'b0000000-0000-0000-0000-000000000100'
  AND parent_id IS NULL
ORDER BY position;

-- =========================================
-- 완료!
-- =========================================
-- 다음 단계:
-- 1. .env.local 설정
-- 2. NEXT_PUBLIC_USE_MOCK=false
-- 3. npm run dev
-- 4. http://localhost:3000/projects 접속
-- =========================================

