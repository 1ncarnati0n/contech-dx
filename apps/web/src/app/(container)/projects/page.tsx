import { ProjectList } from '@/components/projects';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';

export const metadata = {
  title: '프로젝트 목록 - ConTech DX',
  description: '건축 직영공사 프로젝트 관리',
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사용자 프로필 가져오기
  const profile = user ? await getCurrentUserProfile() : null;
  const isAdmin = profile ? isSystemAdmin(profile) : false;

  return <ProjectList isAdmin={isAdmin} />;
}

