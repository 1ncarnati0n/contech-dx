-- =========================================
-- 관리자가 project_members 테이블 관리 가능하도록 정책 추가
-- =========================================
-- 관리자는 모든 프로젝트의 멤버를 추가/수정/삭제할 수 있어야 합니다.
-- 
-- 실행 순서:
-- 1. Supabase SQL Editor에서 실행
-- 
-- 작성일: 2025-01-XX
-- 버전: 1.0.0
-- =========================================

-- 관리자는 프로젝트 멤버 추가 가능
DROP POLICY IF EXISTS "Admins can add project members" ON project_members;
CREATE POLICY "Admins can add project members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 관리자는 프로젝트 멤버 수정 가능
DROP POLICY IF EXISTS "Admins can update project members" ON project_members;
CREATE POLICY "Admins can update project members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 관리자는 프로젝트 멤버 삭제 가능
DROP POLICY IF EXISTS "Admins can delete project members" ON project_members;
CREATE POLICY "Admins can delete project members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- =========================================
-- 확인 쿼리
-- =========================================
-- 다음 쿼리로 정책이 올바르게 생성되었는지 확인하세요:
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'project_members'
-- ORDER BY policyname;
