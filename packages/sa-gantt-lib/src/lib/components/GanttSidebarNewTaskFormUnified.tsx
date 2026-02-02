'use client';

import React from 'react';
import { BaseTaskForm } from './forms';
import { taskUnifiedFormConfig } from './forms/formConfigs';
import type { ConstructionTask } from '../types';

interface GanttSidebarNewTaskFormUnifiedProps {
    columns: Array<{ id: string; label: string; width: number; minWidth: number }>;
    tasks: ConstructionTask[];
    activeCPId: string | null | undefined;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onCancel: () => void;
    isVirtualized?: boolean;
    virtualRowIndex?: number;
    dragHandleWidth?: number;
}

/**
 * 새 Task 추가 폼 컴포넌트 (UNIFIED View용)
 *
 * Unified View의 컬럼 구조(작업명, 기간, 시작일, 종료일)에 맞춘 입력 폼입니다.
 * 선택된 CP 아래에 새 Task를 생성합니다.
 */
export const GanttSidebarNewTaskFormUnified: React.FC<GanttSidebarNewTaskFormUnifiedProps> = (props) => {
    return <BaseTaskForm {...props} config={taskUnifiedFormConfig} />;
};
