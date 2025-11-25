import { useMemo } from 'react';
import type { ViewType } from '../../types';

interface ScaleConfig {
    unit: 'year' | 'month' | 'week' | 'day' | 'hour';
    step: number;
    format: string;
}

const TIME_SCALE_CONFIGS: Record<ViewType, { scales: ScaleConfig[] }> = {
    day: {
        scales: [
            { unit: 'year', step: 1, format: 'yyyy년' },
            { unit: 'month', step: 1, format: 'M월' },
            { unit: 'day', step: 1, format: 'd' },
        ],
    },
    week: {
        scales: [
            { unit: 'year', step: 1, format: 'yyyy년' },
            { unit: 'month', step: 1, format: 'M월' },
            { unit: 'week', step: 1, format: 'w주' },
        ],
    },
    month: {
        scales: [
            { unit: 'year', step: 1, format: 'yyyy년' },
            { unit: 'month', step: 1, format: 'M월' },
        ],
    },
};

/**
 * Gantt 타임스케일 설정 훅
 * viewType에 따라 적절한 scale 설정 반환
 */
export function useGanttScales(viewType: ViewType): ScaleConfig[] {
    return useMemo(() => TIME_SCALE_CONFIGS[viewType].scales, [viewType]);
}
