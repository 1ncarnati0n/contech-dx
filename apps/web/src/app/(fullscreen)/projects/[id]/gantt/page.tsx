import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { getProject } from '@/lib/services/projects';
import { FullscreenGanttPage } from '@/components/projects/FullscreenGanttPage';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GanttFullscreenPage({ params }: Props) {
  // 인증 체크 - 비로그인 시 랜딩 페이지로 리다이렉트
  await requireAuth();

  const supabase = await createClient();
  const { id } = await params;

  // Load project data
  const project = await getProject(id, supabase);

  if (!project) {
    notFound();
  }

  return <FullscreenGanttPage projectId={project.id} projectName={project.name} />;
}
