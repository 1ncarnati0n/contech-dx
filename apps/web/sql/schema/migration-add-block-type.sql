-- Migration: Add BLOCK type to gantt_tasks
-- BLOCK은 CP들을 그룹화하는 최상위 레벨 타입

-- 기존 CHECK 제약조건 삭제 후 BLOCK 포함하여 재생성
ALTER TABLE gantt_tasks
    DROP CONSTRAINT IF EXISTS gantt_tasks_type_check;

ALTER TABLE gantt_tasks
    ADD CONSTRAINT gantt_tasks_type_check
    CHECK (type IN ('BLOCK', 'GROUP', 'CP', 'TASK'));
