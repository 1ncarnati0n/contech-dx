/**
 * Mock 데이터 변환 유틸리티
 * 
 * public/mock.json의 Gantt 차트 데이터를 Supabase 형식으로 변환합니다.
 */

import mockData from '@/../public/mock.json';
import type { Task, Link, TaskType, LinkType } from '@/lib/gantt/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * mock.json의 tasks를 Supabase tasks 형식으로 변환
 * 
 * @param ganttChartId - Gantt 차트 ID
 * @returns 변환된 Task 배열 및 ID 매핑 테이블
 */
export function convertMockTasksToSupabase(ganttChartId: string): {
  tasks: Partial<Task>[];
  idMapping: Map<string | number, string>;
} {
  const idMapping = new Map<string | number, string>();

  // 1. 먼저 모든 temp ID를 UUID로 매핑
  mockData.tasks.forEach((task) => {
    const newId = uuidv4();
    idMapping.set(task.id, newId);
  });

  // 2. Task 변환
  const tasks: Partial<Task>[] = mockData.tasks.map((task, index) => {
    // parent 처리
    let parentId: string | undefined = undefined;
    if (task.parent && task.parent !== 0) {
      // parent가 temp:// ID인 경우 UUID로 변환
      parentId = idMapping.get(task.parent);
    }

    return {
      id: idMapping.get(task.id)!,
      text: task.text,
      type: task.type as TaskType,
      start: task.start,
      end: task.end || undefined,
      progress: task.progress || 0,
      parent: parentId,
      position: index,
      open: task.open !== undefined ? task.open : true,
    };
  });

  return { tasks, idMapping };
}

/**
 * mock.json의 links를 Supabase links 형식으로 변환
 * 
 * @param ganttChartId - Gantt 차트 ID
 * @param idMapping - Task ID 매핑 테이블
 * @returns 변환된 Link 배열
 */
export function convertMockLinksToSupabase(
  ganttChartId: string,
  idMapping: Map<string | number, string>
): Partial<Link>[] {
  return mockData.links.map((link) => {
    // source와 target을 temp ID에서 UUID로 변환
    const sourceId = idMapping.get(link.source) || String(link.source);
    const targetId = idMapping.get(link.target) || String(link.target);

    return {
      source: sourceId,
      target: targetId,
      type: link.type as LinkType,
    };
  });
}

/**
 * mock.json의 scales 정보
 */
export function getMockScales() {
  return mockData.scales;
}

/**
 * mock.json의 프로젝트 정보 (메타데이터)
 */
export function getMockProjectInfo() {
  // mock.json 기반으로 프로젝트 시작일/종료일 계산
  const allDates = mockData.tasks
    .flatMap((task) => [task.start, task.end])
    .filter((date): date is string => !!date)
    .sort();

  return {
    name: 'CP 지하골조(벽체+슬래브)',
    description: 'mock.json 기반 골조공사 샘플 데이터',
    start_date: allDates[0] || '2025-11-04',
    end_date: allDates[allDates.length - 1] || '2025-12-30',
    totalTasks: mockData.tasks.length,
    totalLinks: mockData.links.length,
  };
}
