'use client';

import { useParams } from 'next/navigation';
import { BuildingBasicInfoPage } from '@/features/building/basic-info/view/BuildingBasicInfoPage';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <BuildingBasicInfoPage projectId={id} />;
}
