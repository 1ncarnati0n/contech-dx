'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { TabLoadingSkeleton } from '@/shared/components/ui';

const PouringSectionReviewPage = dynamic(
  () => import('@/features/building/pouring-section/view/PouringSectionReviewPage').then(m => ({ default: m.PouringSectionReviewPage })),
  { loading: () => <TabLoadingSkeleton title="타설구간검토 로딩 중..." /> }
);

export default function PouringSectionPage() {
  const { id } = useParams<{ id: string }>();
  return <PouringSectionReviewPage projectId={id} />;
}
