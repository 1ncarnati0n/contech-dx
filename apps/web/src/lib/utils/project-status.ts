/**
 * 프로젝트 상태 관련 유틸리티
 * 프로젝트 상태별 색상, 라벨 등을 제공합니다.
 */

import type { ProjectStatus } from '@/lib/types';

/**
 * 프로젝트 상태 설정
 */
interface ProjectStatusConfig {
  /** 상태 라벨 (한글) */
  label: string;
  /** 상태별 Tailwind CSS 클래스 */
  colors: string;
  /** 상태 아이콘 (선택적) */
  icon?: string;
}

/**
 * 프로젝트 상태별 설정
 */
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, ProjectStatusConfig> = {
  announcement: {
    label: '공모',
    colors: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    icon: '📢',
  },
  bidding: {
    label: '입찰',
    colors: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    icon: '📋',
  },
  award: {
    label: '수주',
    colors: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    icon: '✅',
  },
  construction_start: {
    label: '착공',
    colors: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    icon: '🚧',
  },
  completion: {
    label: '준공',
    colors: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    icon: '🏗️',
  },
} as const;

/**
 * 프로젝트 상태 라벨 반환
 * @param status - 프로젝트 상태
 * @returns 한글 라벨
 */
export function getStatusLabel(status: ProjectStatus | null | undefined): string {
  if (!status) return '알 수 없음';
  return PROJECT_STATUS_CONFIG[status]?.label ?? '알 수 없음';
}

/**
 * 프로젝트 상태별 색상 클래스 반환
 * @param status - 프로젝트 상태
 * @returns Tailwind CSS 클래스 문자열
 */
export function getStatusColors(status: ProjectStatus | null | undefined): string {
  if (!status) return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  return PROJECT_STATUS_CONFIG[status]?.colors ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

/**
 * 프로젝트 상태 아이콘 반환
 * @param status - 프로젝트 상태
 * @returns 이모지 아이콘
 */
export function getStatusIcon(status: ProjectStatus): string {
  return PROJECT_STATUS_CONFIG[status]?.icon ?? '📁';
}

/**
 * 모든 프로젝트 상태 목록 반환 (드롭다운 등에서 사용)
 * @param includeTest - 테스트(dummy) 상태 포함 여부
 * @returns 상태 배열
 */
export function getAllProjectStatuses(includeTest = false): ProjectStatus[] {
  if (includeTest) {
    return ['announcement', 'bidding', 'award', 'construction_start', 'completion'];
  }
  const statuses: ProjectStatus[] = ['announcement', 'bidding', 'award', 'construction_start', 'completion'];
  return statuses;
}

/**
 * 프로젝트 상태 옵션 목록 반환 (select 등에서 사용)
 * @param includeTest - 테스트(dummy) 상태 포함 여부
 * @returns { value, label } 배열
 */
export function getStatusOptions(includeTest = false): Array<{ value: ProjectStatus; label: string }> {
  return getAllProjectStatuses(includeTest).map(status => ({
    value: status,
    label: getStatusLabel(status),
  }));
}
