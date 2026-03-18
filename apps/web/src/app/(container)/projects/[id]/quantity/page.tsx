'use client';

import { useParams } from 'next/navigation';
import { QuantityInputPage } from '@/features/building/quantity/view/QuantityInputPage';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <QuantityInputPage projectId={id} />;
}
