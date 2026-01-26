-- =========================================
-- SA-Gantt 샘플 데이터
-- =========================================
-- CP 지하골조 (벽체+슬래브) 공정 데이터
--
-- 실행 순서:
-- 1. schema-roles.sql 실행 완료
-- 2. schema-projects.sql 실행 완료
-- 3. schema-gantt.sql 실행 완료
-- 4. 이 파일 실행
--
-- 작성일: 2025-01-26
-- 버전: 2.0.0 (SA-Gantt 전용)
-- =========================================

-- =========================================
-- 1. 샘플 프로젝트
-- =========================================

INSERT INTO projects (
  id,
  project_number,
  name,
  description,
  location,
  client,
  contract_amount,
  start_date,
  end_date,
  status
) VALUES (
  'a0000000-0000-0000-0000-000000000100',
  1,
  '서울 강남 오피스 빌딩 신축 - 지하 골조공사',
  'CP 지하골조 (벽체+슬래브) 공정 - SA-Gantt 연동 테스트',
  '서울특별시 강남구 테헤란로 123',
  '강남건설(주)',
  2500000000,
  '2025-11-04',
  '2025-11-24',
  'construction_start'
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 2. SA-Gantt Tasks (GROUP/CP/TASK 계층)
-- =========================================

-- GROUP: CP 지하골조 (최상위)
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, group_data, is_expanded, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000100',
  NULL,
  1,
  'GROUP',
  'CP 지하골조(벽체+슬래브)',
  '2025-11-04',
  '2025-11-24',
  '{"progress": 52}',
  true,
  1
) ON CONFLICT (id) DO NOTHING;

-- CP: 벽체(유로폼)
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, cp_data, is_expanded, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000001',
  1,
  'CP',
  '벽체(유로폼)',
  '2025-11-04',
  '2025-11-14',
  '{"workDaysTotal": 8, "nonWorkDaysTotal": 2}',
  true,
  2
) ON CONFLICT (id) DO NOTHING;

-- TASK: 철근 현장조립 (벽체)
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000002',
  2,
  'TASK',
  '철근 현장조립',
  '2025-11-04',
  '2025-11-07',
  '{"netWorkDays": 3, "indirectWorkDaysPre": 0, "indirectWorkDaysPost": 0}',
  3
) ON CONFLICT (id) DO NOTHING;

-- TASK: 검측 (철근)
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000002',
  2,
  'TASK',
  '검측',
  '2025-11-08',
  '2025-11-09',
  '{"netWorkDays": 1, "indirectWorkDaysPre": 0, "indirectWorkDaysPost": 0}',
  4
) ON CONFLICT (id) DO NOTHING;

-- TASK: 유로폼 설치
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000002',
  2,
  'TASK',
  '유로폼 설치',
  '2025-11-07',
  '2025-11-12',
  '{"netWorkDays": 4, "indirectWorkDaysPre": 1, "indirectWorkDaysPost": 0}',
  5
) ON CONFLICT (id) DO NOTHING;

-- TASK: 유로폼 보강
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000002',
  2,
  'TASK',
  '유로폼 보강',
  '2025-11-12',
  '2025-11-14',
  '{"netWorkDays": 2, "indirectWorkDaysPre": 0, "indirectWorkDaysPost": 0}',
  6
) ON CONFLICT (id) DO NOTHING;

-- CP: 슬래브(합판거푸집)
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, cp_data, is_expanded, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000001',
  1,
  'CP',
  '슬래브(합판거푸집)',
  '2025-11-10',
  '2025-11-24',
  '{"workDaysTotal": 10, "nonWorkDaysTotal": 4}',
  true,
  7
) ON CONFLICT (id) DO NOTHING;

-- TASK: 강관동바리 설치
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000007',
  2,
  'TASK',
  '강관동바리 설치',
  '2025-11-10',
  '2025-11-14',
  '{"netWorkDays": 4, "indirectWorkDaysPre": 0, "indirectWorkDaysPost": 0}',
  8
) ON CONFLICT (id) DO NOTHING;

-- TASK: 합판거푸집 설치
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000007',
  2,
  'TASK',
  '합판거푸집 설치',
  '2025-11-12',
  '2025-11-15',
  '{"netWorkDays": 3, "indirectWorkDaysPre": 1, "indirectWorkDaysPost": 0}',
  9
) ON CONFLICT (id) DO NOTHING;

-- TASK: 철근 현장조립 (슬래브)
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000007',
  2,
  'TASK',
  '철근 현장조립',
  '2025-11-14',
  '2025-11-17',
  '{"netWorkDays": 3, "indirectWorkDaysPre": 0, "indirectWorkDaysPost": 0}',
  10
) ON CONFLICT (id) DO NOTHING;

-- TASK: 콘크리트 타설
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000011',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000007',
  2,
  'TASK',
  '콘크리트 펌프차 타설',
  '2025-11-18',
  '2025-11-19',
  '{"netWorkDays": 1, "indirectWorkDaysPre": 0, "indirectWorkDaysPost": 0}',
  11
) ON CONFLICT (id) DO NOTHING;

-- TASK: 양생
INSERT INTO gantt_tasks (
  id, project_id, parent_id, wbs_level, type, name,
  start_date, end_date, task_data, sort_order
) VALUES (
  'g0000000-0000-0000-0000-000000000012',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000007',
  2,
  'TASK',
  '양생',
  '2025-11-19',
  '2025-11-24',
  '{"netWorkDays": 5, "indirectWorkDaysPre": 0, "indirectWorkDaysPost": 0}',
  12
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 3. Milestones
-- =========================================

INSERT INTO gantt_milestones (
  id, project_id, date, name, description, milestone_type
) VALUES (
  'm0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000100',
  '2025-11-14',
  '벽체 공정 완료',
  '유로폼 벽체 작업 완료 마일스톤',
  'DETAIL'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO gantt_milestones (
  id, project_id, date, name, description, milestone_type
) VALUES (
  'm0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000100',
  '2025-11-24',
  '지하골조 완료',
  '지하 골조 공사 전체 완료 마일스톤',
  'MASTER'
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 4. Dependencies (앵커 기반)
-- =========================================

-- 철근조립 → 검측
INSERT INTO gantt_dependencies (
  id, project_id, source_task_id, target_task_id,
  source_day_index, target_day_index, lag
) VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000003',
  'g0000000-0000-0000-0000-000000000004',
  3,    -- 소스 끝 (day 3)
  0,    -- 타겟 시작 (day 0)
  0
) ON CONFLICT (id) DO NOTHING;

-- 철근조립 → 유로폼 설치 (Overlap)
INSERT INTO gantt_dependencies (
  id, project_id, source_task_id, target_task_id,
  source_day_index, target_day_index, lag
) VALUES (
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000003',
  'g0000000-0000-0000-0000-000000000005',
  2.5,  -- 소스 중간
  0,    -- 타겟 시작
  0
) ON CONFLICT (id) DO NOTHING;

-- 유로폼 설치 → 유로폼 보강
INSERT INTO gantt_dependencies (
  id, project_id, source_task_id, target_task_id,
  source_day_index, target_day_index, lag
) VALUES (
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000005',
  'g0000000-0000-0000-0000-000000000006',
  5,
  0,
  0
) ON CONFLICT (id) DO NOTHING;

-- 합판거푸집 설치 → 철근 현장조립(슬래브)
INSERT INTO gantt_dependencies (
  id, project_id, source_task_id, target_task_id,
  source_day_index, target_day_index, lag
) VALUES (
  'd0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000009',
  'g0000000-0000-0000-0000-000000000010',
  3,
  0,
  0
) ON CONFLICT (id) DO NOTHING;

-- 철근 현장조립(슬래브) → 콘크리트 타설
INSERT INTO gantt_dependencies (
  id, project_id, source_task_id, target_task_id,
  source_day_index, target_day_index, lag
) VALUES (
  'd0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000010',
  'g0000000-0000-0000-0000-000000000011',
  3,
  0,
  1     -- 1일 지연 (검측 시간)
) ON CONFLICT (id) DO NOTHING;

-- 콘크리트 타설 → 양생
INSERT INTO gantt_dependencies (
  id, project_id, source_task_id, target_task_id,
  source_day_index, target_day_index, lag
) VALUES (
  'd0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000100',
  'g0000000-0000-0000-0000-000000000011',
  'g0000000-0000-0000-0000-000000000012',
  1,
  0,
  0
) ON CONFLICT (id) DO NOTHING;

-- =========================================
-- 5. 확인 쿼리
-- =========================================

-- 프로젝트 확인
SELECT
  id,
  name,
  status,
  start_date,
  end_date
FROM projects
WHERE id = 'a0000000-0000-0000-0000-000000000100';

-- Tasks 확인 (계층 구조)
SELECT
  t.id,
  t.type,
  t.name,
  t.wbs_level,
  t.start_date,
  t.end_date,
  p.name as parent_name
FROM gantt_tasks t
LEFT JOIN gantt_tasks p ON t.parent_id = p.id
WHERE t.project_id = 'a0000000-0000-0000-0000-000000000100'
ORDER BY t.sort_order;

-- Milestones 확인
SELECT id, name, date, milestone_type
FROM gantt_milestones
WHERE project_id = 'a0000000-0000-0000-0000-000000000100'
ORDER BY date;

-- Dependencies 확인
SELECT
  d.id,
  s.name as source_task,
  t.name as target_task,
  d.source_day_index,
  d.target_day_index,
  d.lag
FROM gantt_dependencies d
JOIN gantt_tasks s ON d.source_task_id = s.id
JOIN gantt_tasks t ON d.target_task_id = t.id
WHERE d.project_id = 'a0000000-0000-0000-0000-000000000100';

-- =========================================
-- 완료!
-- =========================================
