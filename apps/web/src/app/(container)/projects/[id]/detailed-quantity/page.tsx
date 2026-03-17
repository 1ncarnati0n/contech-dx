'use client';

import { useParams } from 'next/navigation';
import { DetailedQuantityInputPage } from '@/features/building/quantity/view/DetailedQuantityInputPage';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <DetailedQuantityInputPage projectId={id} />;
}
