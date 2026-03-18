'use client';

import { Card } from '@/shared/components/ui';
import { Users } from 'lucide-react';
import { useDailyWorkerInput } from '../service/useDailyWorkerInput';

interface Props {
  projectId: string;
}

const WORKER_CATEGORIES = [
  { key: 'gangForm', label: '갱폼' },
  { key: 'alForm', label: '알폼' },
  { key: 'formwork', label: '형틀' },
  { key: 'rebar', label: '철근' },
  { key: 'concrete', label: '타설' },
] as const;

export function DailyWorkerInputDashboard({ projectId }: Props) {
  const { isLoading, workerCounts } = useDailyWorkerInput(projectId);

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">금일 인원투입현황</h3>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
          <p>데이터 로딩 중...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {WORKER_CATEGORIES.map(({ key, label }) => (
            <div
              key={key}
              className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3 border border-slate-200 dark:border-slate-800"
            >
              <div className="text-sm font-bold text-slate-900 dark:text-white mb-2" style={{ fontSize: '1.05em' }}>
                {label}
              </div>
              <div className="flex items-baseline gap-1">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{workerCounts[key]}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">명</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
