'use client';

import { useProject } from '../ProjectContext';
import { ProjectTeamPage } from '@/features/project/view/ProjectTeamPage';

export default function TeamRoute() {
  const { project } = useProject();
  return <ProjectTeamPage projectId={project.id} projectCreatedBy={project.created_by} />;
}
