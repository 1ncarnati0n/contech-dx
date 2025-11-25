import { useMemo } from 'react';
import { defaultColumns, type IColumnConfig } from '@svar-ui/react-gantt';

const START_COLUMN_WIDTH = 100;

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function formatDisplayEnd(task: Record<string, any>): string {
    const exclusiveEnd =
        task.end instanceof Date ? task.end : task.end ? new Date(task.end as string) : undefined;
    if (!exclusiveEnd) {
        return '';
    }

    const inclusive = new Date(exclusiveEnd);
    inclusive.setDate(inclusive.getDate() - 1);

    const start =
        task.start instanceof Date ? task.start : task.start ? new Date(task.start as string) : undefined;
    if (start && inclusive < start) {
        return dateFormatter.format(start);
    }

    return dateFormatter.format(inclusive);
}

/**
 * Gantt 컬럼 설정 훅
 * defaultColumns를 한글화하고 포맷 적용
 */
export function useGanttColumns(): IColumnConfig[] {
    return useMemo<IColumnConfig[]>(() => {
        return defaultColumns.map((column) => {
            if (column.id === 'text') {
                return { ...column, header: '단위공정' };
            }

            if (column.id === 'start') {
                return {
                    ...column,
                    header: '시작',
                    width: START_COLUMN_WIDTH,
                    format: 'yyyy-MM-dd',
                };
            }

            if (column.id === 'end') {
                return {
                    ...column,
                    header: '종료',
                    width: START_COLUMN_WIDTH,
                    format: 'yyyy-MM-dd',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    template: (_: unknown, task: Record<string, any>) => formatDisplayEnd(task),
                };
            }

            if (column.id === 'duration') {
                return {
                    ...column,
                    header: 'D',
                    width: Math.round(START_COLUMN_WIDTH * 0.45),
                };
            }

            return column;
        });
    }, []);
}
