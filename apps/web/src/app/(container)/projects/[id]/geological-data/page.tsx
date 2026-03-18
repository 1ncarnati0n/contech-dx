'use client';

import { useParams } from 'next/navigation';
import { GeologicalDataPage } from '@/features/building/geological-data/view/GeologicalDataPage';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <GeologicalDataPage projectId={id} />;
}
