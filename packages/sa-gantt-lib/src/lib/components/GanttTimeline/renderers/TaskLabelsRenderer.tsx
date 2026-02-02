'use client';

import React from 'react';
import { GANTT_LAYOUT, GANTT_SUMMARY } from '../../../types';
import { TaskBar } from '../TaskBar';
import type { TaskLabelsRendererProps } from './types';

const { BAR_HEIGHT } = GANTT_LAYOUT;
const { BAR_HEIGHT: SUMMARY_BAR_HEIGHT } = GANTT_SUMMARY;

/**
 * TaskLabelsRenderer
 *
 * Task Labels 렌더링을 담당하는 통합 컴포넌트입니다.
 * TaskBar의 renderMode="label"을 사용하여 라벨만 렌더링합니다.
 */
export const TaskLabelsRenderer: React.FC<TaskLabelsRendererProps> = React.memo(({
    tasks,
    rowData,
    allTasks,
    minDate,
    pixelsPerDay,
    effectiveBarHeight,
    isMasterView,
    isUnifiedView,
    holidays,
    calendarSettings,
    getDragInfo,
    getTaskGroupDragDeltaDays,
    getTaskDragInfo,
    focusedTaskId,
    offsetY = 0,
}) => {
    return (
        <>
            {rowData.map((row) => {
                const task = tasks[row.index];
                if (!task) return null;

                // BLOCK은 모든 뷰에서 별도 바로 렌더링되므로 라벨 스킵
                if (task.type === 'BLOCK') return null;
                // GROUP은 MASTER 뷰가 아닐 때만 별도 바로 렌더링되므로 라벨 스킵
                if (!isMasterView && task.type === 'GROUP') return null;

                const isCP = task.type === 'CP';
                const isGroup = task.type === 'GROUP';

                // 라벨 바 높이 결정
                let labelBarHeight: number;
                if (isCP) {
                    labelBarHeight = BAR_HEIGHT;
                } else if (isGroup) {
                    labelBarHeight = SUMMARY_BAR_HEIGHT;
                } else {
                    labelBarHeight = effectiveBarHeight;
                }
                const y = row.start + (row.size - labelBarHeight) / 2 + offsetY;
                const useMasterStyle = isMasterView || (isUnifiedView && isCP);

                return (
                    <TaskBar
                        key={`label-${row.key}`}
                        task={task}
                        y={y}
                        minDate={minDate}
                        pixelsPerDay={pixelsPerDay}
                        isMasterView={useMasterStyle}
                        renderMode="label"
                        allTasks={allTasks}
                        holidays={holidays}
                        calendarSettings={calendarSettings}
                        dragInfo={getDragInfo(task.id)}
                        groupDragDeltaDays={getTaskGroupDragDeltaDays(task.id)}
                        groupDragInfo={getTaskDragInfo(task.id)}
                        isFocused={focusedTaskId === task.id}
                        barHeight={effectiveBarHeight}
                    />
                );
            })}
        </>
    );
});

TaskLabelsRenderer.displayName = 'TaskLabelsRenderer';
