/**
 * Mock API Route
 * Gantt 차트 샘플 데이터를 반환합니다.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // 샘플 Gantt 데이터
  const mockData = {
    tasks: [
      {
        id: 1,
        text: '프로젝트 시작',
        type: 'milestone',
        start: new Date('2024-01-01'),
        duration: 0,
        progress: 100,
      },
      {
        id: 2,
        text: '요구사항 분석',
        type: 'task',
        start: new Date('2024-01-05'),
        end: new Date('2024-01-20'),
        duration: 15,
        progress: 100,
      },
      {
        id: 3,
        text: '설계',
        type: 'task',
        start: new Date('2024-01-21'),
        end: new Date('2024-02-15'),
        duration: 25,
        progress: 100,
      },
      {
        id: 4,
        text: '개발',
        type: 'task',
        start: new Date('2024-02-16'),
        end: new Date('2024-05-31'),
        duration: 104,
        progress: 60,
      },
      {
        id: 5,
        text: '테스트',
        type: 'task',
        start: new Date('2024-06-01'),
        end: new Date('2024-06-30'),
        duration: 30,
        progress: 20,
      },
      {
        id: 6,
        text: '배포',
        type: 'milestone',
        start: new Date('2024-07-01'),
        duration: 0,
        progress: 0,
      },
    ],
    links: [
      { id: 1, source: 1, target: 2, type: 'e2s' },
      { id: 2, source: 2, target: 3, type: 'e2s' },
      { id: 3, source: 3, target: 4, type: 'e2s' },
      { id: 4, source: 4, target: 5, type: 'e2s' },
      { id: 5, source: 5, target: 6, type: 'e2s' },
    ],
    scales: [
      { unit: 'month', step: 1, format: 'MMMM yyy' },
      { unit: 'day', step: 1, format: 'd' },
    ],
  };

  return NextResponse.json(mockData);
}

