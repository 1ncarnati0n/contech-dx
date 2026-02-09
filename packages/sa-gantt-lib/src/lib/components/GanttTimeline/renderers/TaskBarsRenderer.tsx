'use client';

import React from 'react';
import { addDays } from 'date-fns';
import { GANTT_LAYOUT, GANTT_SUMMARY } from '../../../types';
import { dateToX } from '../../../utils/dateUtils';
import { calculateGroupDateRange } from '../../../utils/groupUtils';
import { TaskBar } from '../TaskBar';
import { GroupSummaryBar } from '../../GroupSummaryBar';
import { BlockBar } from '../../BlockBar';
import { DragGhost } from '../DragGhost';
import type { TaskAreaRendererProps } from './types';

const { BAR_HEIGHT } = GANTT_LAYOUT;
const { BAR_HEIGHT: SUMMARY_BAR_HEIGHT } = GANTT_SUMMARY;

/**
 * TaskBarsRenderer
 *
 * Task Bars 렌더링을 담당하는 통합 컴포넌트입니다.
 * 'content' 모드와 'all' 모드에서 공통으로 사용되며,
 * offsetY 값으로 Y 위치를 조정합니다.
 */
export const TaskBarsRenderer: React.FC<TaskAreaRendererProps> = React.memo(({
    tasks,
    allTasks,
    rowData,
    minDate,
    pixelsPerDay,
    effectiveBarHeight,
    isCompact,
    isMasterView,
    isUnifiedView,
    holidays,
    calendarSettings,
    getDragInfo,
    handleBarMouseDown,
    getTaskGroupDragDeltaDays,
    getTaskDragInfo,
    getGroupDragDeltaDays,
    handleGroupBarMouseDown,
    onGroupToggle,
    selectTask,
    focusedTaskId,
    onTaskDoubleClick,
    onBarDrag,
    onGroupDrag,
    setHoveredTaskId,
    groupConnectingFrom,
    getGroupConnectionStatus,
    onGroupDependencyCreate,
    handleGroupEdgeClick,
    handleGroupEdgeHover,
    getBlockGhostInfo,
    offsetY = 0,
}) => {
    return (
        <>
            {rowData.map((row) => {
                const task = tasks[row.index];
                if (!task) return null;

                const isBlock = task.type === 'BLOCK';
                const isGroup = task.type === 'GROUP';
                const isCP = task.type === 'CP';

                // 바 높이 결정
                let barHeightForTask: number;
                if (isBlock || isCP) {
                    barHeightForTask = BAR_HEIGHT;
                } else if (isGroup) {
                    barHeightForTask = SUMMARY_BAR_HEIGHT;
                } else {
                    barHeightForTask = effectiveBarHeight;
                }
                const y = row.start + (row.size - barHeightForTask) / 2 + offsetY;

                // BLOCK 렌더링
                if (isBlock) {
                    return (
                        <BlockBar
                            key={`block-${row.key}`}
                            block={task}
                            allTasks={allTasks}
                            y={y}
                            minDate={minDate}
                            pixelsPerDay={pixelsPerDay}
                            currentDeltaDays={getGroupDragDeltaDays(task.id)}
                            isDraggable={!!onGroupDrag}
                            groupDragInfo={getTaskDragInfo(task.id)}
                            onDragStart={handleGroupBarMouseDown}
                            onToggle={onGroupToggle}
                            onClick={(e, blockId) => {
                                selectTask(blockId, {
                                    ctrlKey: e.ctrlKey || e.metaKey,
                                    shiftKey: e.shiftKey,
                                    visibleTasks: tasks,
                                });
                            }}
                            isFocused={focusedTaskId === task.id}
                        />
                    );
                }

                // GROUP 렌더링 (MASTER 뷰가 아닐 때만)
                if (!isMasterView && isGroup) {
                    return (
                        <GroupSummaryBar
                            key={`group-${row.key}`}
                            group={task}
                            allTasks={allTasks}
                            y={y}
                            minDate={minDate}
                            pixelsPerDay={pixelsPerDay}
                            isDraggable={!!onGroupDrag}
                            currentDeltaDays={getGroupDragDeltaDays(task.id)}
                            groupDragInfo={getTaskDragInfo(task.id)}
                            onDragStart={handleGroupBarMouseDown}
                            onToggle={onGroupToggle}
                            onClick={(e, groupId) => {
                                selectTask(groupId, {
                                    ctrlKey: e.ctrlKey || e.metaKey,
                                    shiftKey: e.shiftKey,
                                    visibleTasks: tasks,
                                });
                            }}
                            isFocused={focusedTaskId === task.id}
                            parentBarHeight={BAR_HEIGHT}
                            isCompact={isCompact}
                            // Group Connection props
                            connectingFrom={groupConnectingFrom}
                            hasConnection={getGroupConnectionStatus(task.id)}
                            onEdgeClick={onGroupDependencyCreate ? handleGroupEdgeClick : undefined}
                            onEdgeHover={onGroupDependencyCreate ? handleGroupEdgeHover : undefined}
                        />
                    );
                }

                // TaskBar 렌더링 (CP, TASK, 또는 MASTER 뷰의 GROUP)
                const useMasterStyle = isMasterView || (isUnifiedView && isCP);

                return (
                    <TaskBar
                        key={row.key}
                        task={task}
                        y={y}
                        minDate={minDate}
                        pixelsPerDay={pixelsPerDay}
                        isMasterView={useMasterStyle}
                        renderMode="bar"
                        allTasks={allTasks}
                        holidays={holidays}
                        calendarSettings={calendarSettings}
                        isDraggable={!isMasterView && !useMasterStyle && !!onBarDrag}
                        dragInfo={getDragInfo(task.id)}
                        groupDragDeltaDays={getTaskGroupDragDeltaDays(task.id)}
                        groupDragInfo={getTaskDragInfo(task.id)}
                        onDragStart={handleBarMouseDown}
                        isFocused={focusedTaskId === task.id}
                        onDoubleClick={!isMasterView && task.type === 'TASK' && onTaskDoubleClick
                            ? () => onTaskDoubleClick(task)
                            : undefined}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        barHeight={effectiveBarHeight}
                    />
                );
            })}

            {/* BLOCK 고스트 바: 드래그 중 반투명 고스트로 이동 위치 표시 */}
            {(() => {
                const ghostInfo = getBlockGhostInfo?.();
                if (!ghostInfo || ghostInfo.ghostDeltaDays === 0) return null;

                const blockRowIndex = tasks.findIndex(t => t.id === ghostInfo.blockId);
                const blockRow = rowData.find(r => r.index === blockRowIndex);
                if (!blockRow) return null;

                const block = tasks[blockRowIndex];
                const dateRange = calculateGroupDateRange(block.id, allTasks);
                if (!dateRange) return null;

                const originalX = dateToX(dateRange.startDate, minDate, pixelsPerDay);
                const ghostStartDate = addDays(dateRange.startDate, ghostInfo.ghostDeltaDays);
                const currentX = dateToX(ghostStartDate, minDate, pixelsPerDay);
                const width = dateRange.totalDays * pixelsPerDay;
                const barY = blockRow.start + (blockRow.size - BAR_HEIGHT) / 2 + offsetY;

                return (
                    <DragGhost
                        originalX={originalX}
                        currentX={currentX}
                        y={barY}
                        width={width}
                        height={12}
                    />
                );
            })()}
        </>
    );
});

TaskBarsRenderer.displayName = 'TaskBarsRenderer';
