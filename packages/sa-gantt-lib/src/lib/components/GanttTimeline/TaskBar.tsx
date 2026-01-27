'use client';

import React from 'react';
import { MasterTaskBar } from './MasterTaskBar';
import { DetailTaskBar } from './DetailTaskBar';
import type { TaskBarProps } from './types';

/**
 * 태스크 바 컴포넌트 (Level 1 & Level 2 통합)
 * 
 * isMasterView에 따라 MasterTaskBar 또는 DetailTaskBar로 위임합니다.
 * 기존 API와의 하위 호환성을 유지합니다.
 */
export const TaskBar: React.FC<TaskBarProps> = React.memo((props) => {
    const { task, isMasterView, ...restProps } = props;

    // GROUP 타입은 렌더링하지 않음
    if (task.type === 'GROUP') return null;

    if (isMasterView) {
        return (
            <MasterTaskBar
                task={task}
                y={restProps.y}
                minDate={restProps.minDate}
                pixelsPerDay={restProps.pixelsPerDay}
                renderMode={restProps.renderMode}
                allTasks={restProps.allTasks}
                holidays={restProps.holidays}
                calendarSettings={restProps.calendarSettings}
                groupDragDeltaDays={restProps.groupDragDeltaDays}
                groupDragInfo={restProps.groupDragInfo}
                isFocused={restProps.isFocused}
            />
        );
    }

    return (
        <DetailTaskBar
            task={task}
            y={restProps.y}
            minDate={restProps.minDate}
            pixelsPerDay={restProps.pixelsPerDay}
            barHeight={restProps.barHeight}
            renderMode={restProps.renderMode}
            holidays={restProps.holidays}
            calendarSettings={restProps.calendarSettings}
            isDraggable={restProps.isDraggable}
            dragInfo={restProps.dragInfo}
            onDragStart={restProps.onDragStart}
            onDoubleClick={restProps.onDoubleClick}
            groupDragDeltaDays={restProps.groupDragDeltaDays}
            groupDragInfo={restProps.groupDragInfo}
            dependencyDragDeltaDays={restProps.dependencyDragDeltaDays}
            dependencyDragInfo={restProps.dependencyDragInfo}
            onDependencyDragStart={restProps.onDependencyDragStart}
            hasDependency={restProps.hasDependency}
            onMouseEnter={restProps.onMouseEnter}
            onMouseLeave={restProps.onMouseLeave}
            isFocused={restProps.isFocused}
        />
    );
});

TaskBar.displayName = 'TaskBar';

// Re-export 분리된 컴포넌트들
export { MasterTaskBar } from './MasterTaskBar';
export { DetailTaskBar } from './DetailTaskBar';
export type { MasterTaskBarProps } from './MasterTaskBar';
export type { DetailTaskBarProps } from './DetailTaskBar';
