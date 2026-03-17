import { notFound } from 'next/navigation';
import { requireProjectMember } from '@/shared/lib/auth/requireProjectMember';
import { getProject } from '@/features/project/repository/projects';
import { createClient } from '@/shared/lib/supabase/server';
import { ProjectLayoutClient } from './ProjectLayoutClient';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: Props) {
  const { id } = await params;

  await requireProjectMember(id);

  const supabase = await createClient();
  const project = await getProject(id, supabase);

  if (!project) {
    notFound();
  }

  return (
    <ProjectLayoutClient project={project}>
      {children}
    </ProjectLayoutClient>
  );
}
