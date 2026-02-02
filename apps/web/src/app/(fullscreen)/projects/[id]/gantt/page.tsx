import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireProjectMember } from '@/lib/auth/requireProjectMember';
import { getProject } from '@/lib/services/projects';
import { FullscreenGanttPage } from '@/components/projects/FullscreenGanttPage';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GanttFullscreenPage({ params }: Props) {
  const { id } = await params;

  // 인증 + 멤버십 체크 - 비로그인 또는 비멤버 시 프로젝트 목록으로 리다이렉트
  await requireProjectMember(id);

  const supabase = await createClient();

  // Load project data
  const project = await getProject(id, supabase);

  if (!project) {
    notFound();
  }

  return <FullscreenGanttPage projectId={project.id} projectName={project.name} />;
}
