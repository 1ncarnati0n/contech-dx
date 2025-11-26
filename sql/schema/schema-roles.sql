-- =========================================
-- 회원 등급 시스템 추가
-- =========================================

-- profiles 테이블에 role 컬럼 추가
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
CHECK (role IN ('admin', 'main_user', 'vip_user', 'user'));

-- profiles 테이블에 추가 정보 컬럼
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- role 컬럼에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- updated_at 트리거
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at_trigger ON profiles;

CREATE TRIGGER update_profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- RLS 정책 업데이트: 사용자는 자신의 프로필을 수정 가능 (role 제외)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- role은 admin만 변경 가능
    (role = (SELECT role FROM profiles WHERE id = auth.uid()) OR
     (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  );

-- Admin 전용: 모든 프로필 수정 가능
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admin 전용: 모든 프로필 삭제 가능
CREATE POLICY "Admins can delete any profile"
  ON profiles FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 회원가입 시 기본 role을 'user'로 설정하는 트리거 수정
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 첫 번째 사용자를 admin으로 설정 (선택사항)
-- 아래 주석을 해제하고 실제 이메일로 변경하세요
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- =========================================
-- 사용자 활동 로그 테이블 (선택사항)
-- =========================================
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);

-- RLS 활성화
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin만 로그 조회 가능
CREATE POLICY "Admins can view all logs"
  ON user_activity_logs FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 사용자는 자신의 로그만 조회 가능
CREATE POLICY "Users can view their own logs"
  ON user_activity_logs FOR SELECT
  USING (auth.uid() = user_id);
