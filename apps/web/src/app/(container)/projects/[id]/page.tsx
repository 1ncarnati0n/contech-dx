'use client';

import { useProject } from './ProjectContext';
import { ProjectOverview } from './ProjectOverview';

export default function ProjectOverviewPage() {
  const { project } = useProject();
  return <ProjectOverview project={project} />;
}
