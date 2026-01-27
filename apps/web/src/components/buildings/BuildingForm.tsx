'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Plus } from 'lucide-react';

interface Props {
  onCreate: (count: number) => void;
  isLoading?: boolean;
}

export function BuildingForm({ onCreate, isLoading }: Props) {
  const [buildingCount, setBuildingCount] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (buildingCount > 0) {
      onCreate(buildingCount);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
        동 수:
      </label>
      <input
        type="number"
        min="1"
        max="20"
        value={buildingCount}
        onChange={(e) => setBuildingCount(Math.max(1, Number(e.target.value)))}
        className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        disabled={isLoading}
      />
      <Button
        type="submit"
        variant="primary"
        size="sm"
        disabled={isLoading || buildingCount <= 0}
        className="gap-2"
      >
        <Plus className="w-4 h-4" />
        {isLoading ? '생성 중...' : '동 탭 생성'}
      </Button>
    </form>
  );
}

