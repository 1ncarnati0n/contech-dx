'use client';

import React from 'react';
import { BaseTaskForm } from './forms';
import { cpUnifiedFormConfig } from './forms/formConfigs';
import type { ConstructionTask } from '../types';

interface GanttSidebarNewCPFormUnifiedProps {
    columns: Array<{ id: string; label: string; width: number; minWidth: number }>;
    tasks: ConstructionTask[];
    allTasks?: ConstructionTask[];
    selectedTaskIds?: Set<string>;
    focusedTaskId?: string | null;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onCancel: () => void;
    isVirtualized?: boolean;
    virtualRowIndex?: number;
    dragHandleWidth?: number;
}

/**
 * 새 CP 추가 폼 컴포넌트 (UNIFIED View용)
 *
 * Unified View의 컬럼 구조(작업명, 기간, 시작일, 종료일)에 맞춘 입력 폼입니다.
 */
export const GanttSidebarNewCPFormUnified: React.FC<GanttSidebarNewCPFormUnifiedProps> = (props) => {
    return <BaseTaskForm {...props} config={cpUnifiedFormConfig} />;
};
