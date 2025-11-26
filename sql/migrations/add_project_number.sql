-- Add project_number column with auto-increment sequence
-- This provides a user-friendly ID for URLs while keeping UUID for internal relations

-- 1. Create a sequence for project numbers
CREATE SEQUENCE IF NOT EXISTS project_number_seq;

-- 2. Add the column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_number INTEGER DEFAULT nextval('project_number_seq');

-- 3. Create a unique index to ensure numbers are unique and fast to look up
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_number ON projects(project_number);

-- 4. Update existing rows (if any) to have numbers if they are null
-- (The DEFAULT above handles new rows, this is for safety on existing data)
-- Note: This simple update might not be perfect for existing data order, but ensures non-null
-- In a real migration, you might want to order by created_at
WITH numbered_projects AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM projects
  WHERE project_number IS NULL
)
UPDATE projects p
SET project_number = np.rn
FROM numbered_projects np
WHERE p.id = np.id;
