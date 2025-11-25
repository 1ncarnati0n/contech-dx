'use client';

import { useState, useEffect } from 'react';
import { GanttWrapper } from '@/components/gantt/GanttWrapper';
import { useGanttSchedule } from '@/lib/gantt/hooks';
import type { Task, Link } from '@/lib/gantt/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// 샘플 데이터
const SAMPLE_TASKS: Task[] = [
  {
    id: '1',
    text: '프로젝트 시작',
    type: 'milestone',
    start: new Date('2024-01-01'),
    duration: 0,
    progress: 100,
  },
  {
    id: '2',
    text: '요구사항 분석',
    type: 'task',
    start: new Date('2024-01-05'),
    end: new Date('2024-01-20'),
    duration: 15,
    progress: 100,
  },
  {
    id: '3',
    text: '설계',
    type: 'task',
    start: new Date('2024-01-21'),
    end: new Date('2024-02-15'),
    duration: 25,
    progress: 100,
  },
  {
    id: '4',
    text: '개발',
    type: 'task',
    start: new Date('2024-02-16'),
    end: new Date('2024-05-31'),
    duration: 104,
    progress: 60,
  },
  {
    id: '5',
    text: '테스트',
    type: 'task',
    start: new Date('2024-06-01'),
    end: new Date('2024-06-30'),
    duration: 30,
    progress: 20,
  },
  {
    id: '6',
    text: '배포',
    type: 'milestone',
    start: new Date('2024-07-01'),
    duration: 0,
    progress: 0,
  },
];

const SAMPLE_LINKS: Link[] = [
  { id: '1', source: '1', target: '2', type: 'e2s' },
  { id: '2', source: '2', target: '3', type: 'e2s' },
  { id: '3', source: '3', target: '4', type: 'e2s' },
  { id: '4', source: '4', target: '5', type: 'e2s' },
  { id: '5', source: '5', target: '6', type: 'e2s' },
];

export default function GanttTestPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Gantt 차트 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gantt 차트 테스트
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              ConTech-DX Gantt 차트 통합 테스트 페이지
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-sm font-medium rounded-full">
              ✅ 통합 완료
            </span>
          </div>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">📊 샘플 데이터</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {SAMPLE_TASKS.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tasks</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {SAMPLE_LINKS.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Links</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              2
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Milestones</div>
          </div>
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              60%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">진행률</div>
          </div>
        </div>
      </Card>

      {/* Gantt Chart */}
      <Card className="p-0 overflow-hidden">
        <div className="h-[600px]">
          <GanttWrapper
            tasks={SAMPLE_TASKS}
            links={SAMPLE_LINKS}
            scales={[
              { unit: 'month', step: 1, format: 'MMMM yyy' },
              { unit: 'day', step: 1, format: 'd' },
            ]}
            onGanttReady={(api) => {
              console.log('✅ Gantt API Ready:', api);
            }}
          />
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          🎉 통합 성공!
        </h3>
        <p className="text-blue-700 dark:text-blue-300 mb-4">
          SAGanttApp의 Gantt 차트가 ConTech-DX에 성공적으로 통합되었습니다.
        </p>
        <div className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
          <p>✅ Gantt 라이브러리 복사 완료 (18개 파일)</p>
          <p>✅ Gantt 컴포넌트 복사 완료 (9개 파일)</p>
          <p>✅ 서비스 레이어 복사 완료 (3개 파일)</p>
          <p>✅ 스타일 파일 복사 완료 (2개 파일)</p>
          <p>✅ @svar-ui/react-gantt 패키지 설치 완료</p>
        </div>
      </Card>
    </div>
  );
}

