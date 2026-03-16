'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { TabLoadingSkeleton } from '@/shared/components/ui';

const ProcessLogicPage = dynamic(
  () => import('@/features/building/process-logic/view/ProcessLogicPage').then(m => ({ default: m.ProcessLogicPage })),
  { loading: () => <TabLoadingSkeleton title="공정로직 로딩 중..." /> }
);

export default function ProcessLogicRoute() {
  const { id } = useParams<{ id: string }>();
  return <ProcessLogicPage projectId={id} />;
}
