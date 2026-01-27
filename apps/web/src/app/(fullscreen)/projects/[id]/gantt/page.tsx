import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProject } from '@/lib/services/projects';
import { FullscreenGanttPage } from '@/components/projects/FullscreenGanttPage';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GanttFullscreenPage({ params }: Props) {
  const supabase = await createClient();
  const { id } = await params;

  // Load project data
  const project = await getProject(id, supabase);

  if (!project) {
    notFound();
  }

  return <FullscreenGanttPage projectId={project.id} projectName={project.name} />;
}
