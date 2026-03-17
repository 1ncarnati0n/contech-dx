'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { TabLoadingSkeleton } from '@/shared/components/ui';

const BasementProcessPlanPage = dynamic(
  () => import('@/features/building/process-plan/view/BasementProcessPlanPage').then(m => ({ default: m.BasementProcessPlanPage })),
  { loading: () => <TabLoadingSkeleton title="지하층 공정계획 로딩 중..." /> }
);

export default function BasementProcessPlanRoute() {
  const { id } = useParams<{ id: string }>();
  return <BasementProcessPlanPage projectId={id} />;
}
