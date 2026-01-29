import { ProjectList } from '@/components/projects';
import { requireAuth } from '@/lib/auth/requireAuth';
import { isSystemAdmin } from '@/lib/permissions/server';

export const metadata = {
  title: '프로젝트 목록 - ConTech DX',
  description: '건축 직영공사 프로젝트 관리',
};

export default async function ProjectsPage() {
  // 인증 체크 - 비로그인 시 랜딩 페이지로 리다이렉트
  const { profile } = await requireAuth();
  const isAdmin = isSystemAdmin(profile);

  return <ProjectList isAdmin={isAdmin} />;
}

