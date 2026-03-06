'use client';

import React from 'react';
import { BaseTaskForm } from './forms';
import { taskDetailFormConfig } from './forms/formConfigs';
import type { ConstructionTask } from '../types';

interface GanttSidebarNewTaskFormProps {
    columns: Array<{ id: string; label: string; width: number; minWidth: number }>;
    tasks: ConstructionTask[];
    allTasks?: ConstructionTask[];
    selectedTaskIds?: Set<string>;
    focusedTaskId?: string | null;
    activeCPId: string | null;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onCancel: () => void;
    isVirtualized?: boolean;
    virtualRowIndex?: number;
}

/**
 * 새 Task 추가 폼 컴포넌트
 *
 * Detail View에서 새 공정을 추가할 때 사용되는 입력 폼입니다.
 */
export const GanttSidebarNewTaskForm: React.FC<GanttSidebarNewTaskFormProps> = (props) => {
    return <BaseTaskForm {...props} config={taskDetailFormConfig} />;
};
