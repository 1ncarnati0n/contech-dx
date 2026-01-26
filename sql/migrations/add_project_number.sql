-- =========================================
-- 기존 DB에 project_number 컬럼 추가
-- =========================================
-- 참고: 새로 설치하는 경우 schema-projects.sql에 이미 포함됨
--       이 파일은 기존 projects 테이블이 있는 경우에만 실행
--
-- 작성일: 2025-01-26
-- =========================================

-- 1. 시퀀스 생성 (없는 경우)
CREATE SEQUENCE IF NOT EXISTS project_number_seq;

-- 2. 컬럼 추가 (없는 경우)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_number INTEGER UNIQUE DEFAULT nextval('project_number_seq');

-- 3. 인덱스 추가 (없는 경우)
CREATE INDEX IF NOT EXISTS idx_projects_project_number ON projects(project_number);

-- 4. 기존 데이터에 project_number 할당 (NULL인 행만)
WITH numbered_projects AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM projects
  WHERE project_number IS NULL
)
UPDATE projects p
SET project_number = np.rn
FROM numbered_projects np
WHERE p.id = np.id;

-- 5. 코멘트
COMMENT ON COLUMN projects.project_number IS 'URL용 짧은 ID (1, 2, 3...)';

-- 확인
SELECT id, project_number, name FROM projects ORDER BY project_number;
