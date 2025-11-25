/**
 * Mock Storage Service
 * LocalStorage 기반 Mock 데이터 관리
 */

import type { GanttChart } from './ganttCharts';
import type { Task } from '@/lib/gantt/types';

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// Storage Keys
const STORAGE_KEYS = {
  ganttCharts: 'contech_dx_gantt_charts',
  tasks: 'contech_dx_tasks',
  links: 'contech_dx_links',
};

// ============================================
// Gantt Charts Mock Storage
// ============================================

export function getMockGanttCharts(projectId: string): GanttChart[] {
  if (!isBrowser) return [];
  const data = localStorage.getItem(STORAGE_KEYS.ganttCharts);
  if (!data) return [];
  const all = JSON.parse(data) as GanttChart[];
  return all.filter((chart) => chart.project_id === projectId);
}

export function getMockGanttChart(id: string): GanttChart | null {
  if (!isBrowser) return null;
  const data = localStorage.getItem(STORAGE_KEYS.ganttCharts);
  if (!data) return null;
  const all = JSON.parse(data) as GanttChart[];
  return all.find((chart) => chart.id === id) || null;
}

export function createMockGanttChart(chart: Omit<GanttChart, 'id' | 'created_at' | 'updated_at'>): GanttChart {
  if (!isBrowser) throw new Error('Cannot create in non-browser environment');
  
  const newChart: GanttChart = {
    ...chart,
    id: `mock-chart-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const data = localStorage.getItem(STORAGE_KEYS.ganttCharts);
  const all = data ? JSON.parse(data) as GanttChart[] : [];
  all.push(newChart);
  localStorage.setItem(STORAGE_KEYS.ganttCharts, JSON.stringify(all));

  console.log('✅ Mock Gantt Chart created:', newChart.id);
  return newChart;
}

export function updateMockGanttChart(id: string, updates: Partial<GanttChart>): GanttChart {
  if (!isBrowser) throw new Error('Cannot update in non-browser environment');
  
  const data = localStorage.getItem(STORAGE_KEYS.ganttCharts);
  if (!data) throw new Error('No charts found');
  
  const all = JSON.parse(data) as GanttChart[];
  const index = all.findIndex((chart) => chart.id === id);
  
  if (index === -1) throw new Error('Chart not found');
  
  all[index] = {
    ...all[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEYS.ganttCharts, JSON.stringify(all));
  console.log('✅ Mock Gantt Chart updated:', id);
  return all[index];
}

export function deleteMockGanttChart(id: string): void {
  if (!isBrowser) return;
  
  const data = localStorage.getItem(STORAGE_KEYS.ganttCharts);
  if (!data) return;
  
  const all = JSON.parse(data) as GanttChart[];
  const filtered = all.filter((chart) => chart.id !== id);
  localStorage.setItem(STORAGE_KEYS.ganttCharts, JSON.stringify(filtered));
  
  console.log('✅ Mock Gantt Chart deleted:', id);
}

// ============================================
// Tasks Mock Storage
// ============================================

export function getMockTasks(ganttChartId: string): Task[] {
  if (!isBrowser) return [];
  const data = localStorage.getItem(STORAGE_KEYS.tasks);
  if (!data) {
    // Initialize with sample tasks if empty
    initializeSampleTasks(ganttChartId);
    const newData = localStorage.getItem(STORAGE_KEYS.tasks);
    if (!newData) return [];
    const all = JSON.parse(newData) as any[];
    return all
      .filter((task: any) => task.gantt_chart_id === ganttChartId)
      .map(taskDtoToTask);
  }
  const all = JSON.parse(data) as any[];
  return all
    .filter((task: any) => task.gantt_chart_id === ganttChartId)
    .map(taskDtoToTask);
}

function taskDtoToTask(taskDto: any): Task {
  return {
    id: taskDto.id,
    text: taskDto.text,
    type: taskDto.type || 'task',
    start: new Date(taskDto.start_date),
    end: taskDto.end_date ? new Date(taskDto.end_date) : undefined,
    duration: taskDto.duration,
    progress: taskDto.progress || 0,
    parent: taskDto.parent_id,
  };
}

function initializeSampleTasks(ganttChartId: string): void {
  const sampleTasks = [
    {
      id: 'task-1',
      gantt_chart_id: ganttChartId,
      text: '프로젝트 시작',
      type: 'milestone',
      start_date: '2024-01-01',
      end_date: '2024-01-01',
      duration: 0,
      progress: 100,
      parent_id: null,
    },
    {
      id: 'task-2',
      gantt_chart_id: ganttChartId,
      text: '요구사항 분석',
      type: 'task',
      start_date: '2024-01-05',
      end_date: '2024-01-20',
      duration: 15,
      progress: 100,
      parent_id: null,
    },
    {
      id: 'task-3',
      gantt_chart_id: ganttChartId,
      text: '설계',
      type: 'task',
      start_date: '2024-01-21',
      end_date: '2024-02-15',
      duration: 25,
      progress: 100,
      parent_id: null,
    },
    {
      id: 'task-4',
      gantt_chart_id: ganttChartId,
      text: '개발',
      type: 'task',
      start_date: '2024-02-16',
      end_date: '2024-05-31',
      duration: 104,
      progress: 60,
      parent_id: null,
    },
    {
      id: 'task-5',
      gantt_chart_id: ganttChartId,
      text: '테스트',
      type: 'task',
      start_date: '2024-06-01',
      end_date: '2024-06-30',
      duration: 30,
      progress: 20,
      parent_id: null,
    },
    {
      id: 'task-6',
      gantt_chart_id: ganttChartId,
      text: '배포',
      type: 'milestone',
      start_date: '2024-07-01',
      end_date: '2024-07-01',
      duration: 0,
      progress: 0,
      parent_id: null,
    },
  ];

  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(sampleTasks));
  console.log('✅ Sample tasks initialized for chart:', ganttChartId);
}

// ============================================
// Links Mock Storage
// ============================================

export function getMockLinks(ganttChartId: string): any[] {
  if (!isBrowser) return [];
  const data = localStorage.getItem(STORAGE_KEYS.links);
  if (!data) {
    // Initialize with sample links if empty
    initializeSampleLinks(ganttChartId);
    const newData = localStorage.getItem(STORAGE_KEYS.links);
    if (!newData) return [];
    const all = JSON.parse(newData) as any[];
    return all.filter((link: any) => link.gantt_chart_id === ganttChartId);
  }
  const all = JSON.parse(data) as any[];
  return all.filter((link: any) => link.gantt_chart_id === ganttChartId);
}

function initializeSampleLinks(ganttChartId: string): void {
  const sampleLinks = [
    {
      id: 'link-1',
      gantt_chart_id: ganttChartId,
      source: 'task-1',
      target: 'task-2',
      type: 'e2s',
    },
    {
      id: 'link-2',
      gantt_chart_id: ganttChartId,
      source: 'task-2',
      target: 'task-3',
      type: 'e2s',
    },
    {
      id: 'link-3',
      gantt_chart_id: ganttChartId,
      source: 'task-3',
      target: 'task-4',
      type: 'e2s',
    },
    {
      id: 'link-4',
      gantt_chart_id: ganttChartId,
      source: 'task-4',
      target: 'task-5',
      type: 'e2s',
    },
    {
      id: 'link-5',
      gantt_chart_id: ganttChartId,
      source: 'task-5',
      target: 'task-6',
      type: 'e2s',
    },
  ];

  localStorage.setItem(STORAGE_KEYS.links, JSON.stringify(sampleLinks));
  console.log('✅ Sample links initialized for chart:', ganttChartId);
}

// ============================================
// Clear All Mock Data
// ============================================

export function clearAllMockData(): void {
  if (!isBrowser) return;
  localStorage.removeItem(STORAGE_KEYS.ganttCharts);
  localStorage.removeItem(STORAGE_KEYS.tasks);
  localStorage.removeItem(STORAGE_KEYS.links);
  console.log('✅ All mock data cleared');
}

