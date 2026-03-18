import { getBuildingsForOverview } from '@/features/building/shared/repository/buildings';
import type { Building } from '@/shared/types';

export async function loadBuildingsForDashboard(projectId: string): Promise<Building[]> {
  return getBuildingsForOverview(projectId);
}
