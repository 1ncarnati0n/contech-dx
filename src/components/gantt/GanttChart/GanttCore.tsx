'use client';

import { useCallback } from 'react';
import { Gantt } from '@svar-ui/react-gantt';
import type { Schedule } from '@/lib/gantt/types';
import type { ViewType } from '../types';
import { useGanttColumns } from './hooks/useGanttColumns';
import { useGanttScales } from './hooks/useGanttScales';
import { isWeekend, isKoreanHoliday } from '@/data/koreanHolidays';
import { TASK_TYPES, CELL_HEIGHT, CELL_WIDTH_MAP } from '../taskConfig';

interface GanttCoreProps {
    schedule: Schedule;
    viewType: ViewType;
    showBaselines: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onApiReady: (api: any) => void;
}

/**
 * GanttCore 컴포넌트
 * SVAR Gantt의 핵심 래퍼. UI 렌더링만 담당.
 */
export function GanttCore({
    schedule,
    viewType,
    showBaselines,
    onApiReady
}: GanttCoreProps) {
    const columns = useGanttColumns();
    const scales = useGanttScales(viewType);

    // 주말 및 공휴일 하이라이트 함수
    const highlightTime = useCallback((date: Date, unit: string) => {
        // day 단위일 때만 주말/공휴일 표시
        if (unit === 'day') {
            if (isKoreanHoliday(date)) {
                return 'wx-holiday'; // 공휴일 스타일
            }
            if (isWeekend(date)) {
                return 'wx-weekend'; // 주말 스타일
            }
        }
        return '';
    }, []);

    // 모든 필수 데이터 검증
    if (!Array.isArray(scales) || !Array.isArray(columns) || !schedule) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">차트 데이터 준비 중...</p>
            </div>
        );
    }

    const tasks = schedule.tasks || [];
    const links = schedule.links || [];

    // 🔍 디버깅: 전달되는 데이터 확인
    console.log('=== GanttCore Render Debug ===', {
        tasksCount: tasks.length,
        linksCount: links.length,
        scalesCount: scales.length,
        columnsCount: columns.length,
        tasksSample: tasks.slice(0, 2),
        linksSample: links.slice(0, 2),
        scalesSample: scales,
        columnsSample: columns.slice(0, 2),
    });

    // tasks나 links에 null이 포함되어 있는지 확인
    const hasNullTasks = tasks.some(t => t === null || t === undefined);
    const hasNullLinks = links.some(l => l === null || l === undefined);

    if (hasNullTasks || hasNullLinks) {
        console.error('❌ Null values detected in tasks or links!', { hasNullTasks, hasNullLinks });
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-red-500">데이터 오류: null 값이 포함되어 있습니다</p>
            </div>
        );
    }

    return (
        <Gantt
            init={onApiReady}
            tasks={tasks}
            links={links}
            scales={scales}
            columns={columns}
            taskTypes={TASK_TYPES}
            cellWidth={CELL_WIDTH_MAP[viewType]}
            cellHeight={CELL_HEIGHT}
            highlightTime={highlightTime}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ baselines: showBaselines } as any)}
        />
    );
}
