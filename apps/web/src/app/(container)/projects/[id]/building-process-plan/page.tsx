'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { TabLoadingSkeleton } from '@/shared/components/ui';

const BuildingProcessPlanPage = dynamic(
  () => import('@/features/building/process-plan/view/BuildingProcessPlanPage').then(m => ({ default: m.BuildingProcessPlanPage })),
  { loading: () => <TabLoadingSkeleton title="지상층 공정계획 로딩 중..." /> }
);

export default function BuildingProcessPlanRoute() {
  const { id } = useParams<{ id: string }>();
  return <BuildingProcessPlanPage projectId={id} />;
}
