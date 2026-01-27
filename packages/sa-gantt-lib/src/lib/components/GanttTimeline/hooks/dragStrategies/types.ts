// ============================================
// 드래그 전략 패턴 타입 정의
// ============================================

import type { CalendarSettings } from '../../../../types';

/**
 * 드래그 계산에 필요한 원본 상태
 */
export interface DragOriginalState {
    originalStartDate: Date;
    originalEndDate: Date;
    originalIndirectWorkDaysPre: number;
    originalNetWorkDays: number;
    originalIndirectWorkDaysPost: number;
}

/**
 * 드래그 계산 결과
 */
export interface DragCalculationResult {
    currentStartDate: Date;
    currentEndDate: Date;
    currentIndirectWorkDaysPre: number;
    currentNetWorkDays: number;
    currentIndirectWorkDaysPost: number;
}

/**
 * 드래그 계산에 필요한 컨텍스트
 */
export interface DragContext {
    deltaDays: number;
    direction: 'left' | 'right';
    holidays: Date[];
    calendarSettings: CalendarSettings;
}

/**
 * 드래그 전략 인터페이스
 *
 * 각 드래그 타입별로 구현체를 가짐
 */
export interface DragStrategy {
    /**
     * 드래그 결과 계산
     *
     * @param state - 원본 상태
     * @param context - 드래그 컨텍스트 (deltaDays, direction, holidays 등)
     * @returns 계산된 새 상태
     */
    calculate(state: DragOriginalState, context: DragContext): DragCalculationResult;
}
