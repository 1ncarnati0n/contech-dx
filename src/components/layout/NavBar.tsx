import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';
import NavBarContent from './NavBarContent';

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사용자 프로필 가져오기
  const profile = user ? await getCurrentUserProfile() : null;
  const isAdmin = profile ? isSystemAdmin(profile) : false;

  return <NavBarContent user={user} profile={profile} isAdmin={isAdmin} />;
}
