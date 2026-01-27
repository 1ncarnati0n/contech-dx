import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import {
    calculateDragDirection,
    calculateDeltaDays,
    calculateHolidaySnap,
    getDragCursor,
    applyFinalHolidaySnap,
    calculateWorkingDaysOffsets,
    calculateTaskMoveResult,
    calculateEndDateFromStart,
    calculateDeltaWorkingDays,
} from '../dragUtils';
import type { CalendarSettings, ConstructionTask } from '../../../../types';

// ============================================
// 테스트 헬퍼 및 픽스처
// ============================================

const defaultCalendarSettings: CalendarSettings = {
    workOnSaturdays: false,
    workOnSundays: false,
    workOnHolidays: false,
};

// 2024년 5월 테스트 기준
// 5/1 (수) - 근로자의날 공휴일
// 5/4 (토), 5/5 (일) - 주말
// 5/11 (토), 5/12 (일) - 주말
const holidays = [parseISO('2024-05-01')]; // 근로자의날

const createMockTask = (
    id: string,
    startDate: string,
    endDate: string,
    taskData?: { indirectWorkDaysPre: number; netWorkDays: number; indirectWorkDaysPost: number }
): ConstructionTask => ({
    id,
    name: `Task ${id}`,
    type: 'TASK',
    wbsLevel: 2,
    startDate: parseISO(startDate),
    endDate: parseISO(endDate),
    task: taskData
        ? {
              netWorkDays: taskData.netWorkDays,
              indirectWorkDaysPre: taskData.indirectWorkDaysPre,
              indirectWorkDaysPost: taskData.indirectWorkDaysPost,
          }
        : undefined,
});

// ============================================
// calculateDragDirection 테스트
// ============================================

describe('calculateDragDirection', () => {
    it('음수 deltaX는 left를 반환', () => {
        expect(calculateDragDirection(-100)).toBe('left');
        expect(calculateDragDirection(-1)).toBe('left');
    });

    it('양수 deltaX는 right를 반환', () => {
        expect(calculateDragDirection(100)).toBe('right');
        expect(calculateDragDirection(1)).toBe('right');
    });

    it('deltaX가 0이면 right를 반환', () => {
        expect(calculateDragDirection(0)).toBe('right');
    });
});

// ============================================
// calculateDeltaDays 테스트
// ============================================

describe('calculateDeltaDays', () => {
    it('픽셀을 일수로 정확히 변환', () => {
        const pixelsPerDay = 20;
        expect(calculateDeltaDays(40, pixelsPerDay)).toBe(2);
        expect(calculateDeltaDays(60, pixelsPerDay)).toBe(3);
    });

    it('반올림 처리', () => {
        const pixelsPerDay = 20;
        expect(calculateDeltaDays(45, pixelsPerDay)).toBe(2); // 2.25 → 2
        expect(calculateDeltaDays(55, pixelsPerDay)).toBe(3); // 2.75 → 3
    });

    it('음수 픽셀도 처리', () => {
        const pixelsPerDay = 20;
        expect(calculateDeltaDays(-40, pixelsPerDay)).toBe(-2);
        expect(calculateDeltaDays(-45, pixelsPerDay)).toBe(-2);
    });
});

// ============================================
// getDragCursor 테스트
// ============================================

describe('getDragCursor', () => {
    it('move 타입은 grabbing 커서', () => {
        expect(getDragCursor('move')).toBe('grabbing');
        expect(getDragCursor('move-net')).toBe('grabbing');
    });

    it('resize 타입은 ew-resize 커서', () => {
        expect(getDragCursor('resize-pre')).toBe('ew-resize');
        expect(getDragCursor('resize-post')).toBe('ew-resize');
    });

    it('boundary 타입은 col-resize 커서', () => {
        expect(getDragCursor('resize-pre-net')).toBe('col-resize');
        expect(getDragCursor('resize-net-post')).toBe('col-resize');
    });
});

// ============================================
// calculateHolidaySnap 테스트
// ============================================

describe('calculateHolidaySnap', () => {
    it('평일로 이동하면 조정 없음', () => {
        const originalDate = parseISO('2024-05-02'); // 목요일
        const result = calculateHolidaySnap(
            originalDate,
            1, // 5/3 (금) - 평일
            'right',
            holidays,
            defaultCalendarSettings
        );

        expect(result.adjustedDeltaDays).toBe(1);
        expect(result.skippedDays).toBe(0);
    });

    it('공휴일로 이동하면 다음 평일로 스냅 (right)', () => {
        const originalDate = parseISO('2024-04-30'); // 화요일
        const result = calculateHolidaySnap(
            originalDate,
            1, // 5/1 (수) - 근로자의날
            'right',
            holidays,
            defaultCalendarSettings
        );

        // 5/1은 휴일이므로 5/2(목)로 스냅
        expect(result.adjustedDeltaDays).toBe(2);
        expect(result.skippedDays).toBe(1);
    });

    it('주말로 이동하면 스냅', () => {
        const originalDate = parseISO('2024-05-03'); // 금요일
        const result = calculateHolidaySnap(
            originalDate,
            1, // 5/4 (토) - 주말
            'right',
            holidays,
            defaultCalendarSettings
        );

        // 토요일은 휴일이므로 5/6(월)로 스냅
        expect(result.adjustedDeltaDays).toBe(3);
        expect(result.skippedDays).toBe(2);
    });

    it('left 방향으로 스냅', () => {
        const originalDate = parseISO('2024-05-06'); // 월요일
        const result = calculateHolidaySnap(
            originalDate,
            -2, // 5/4 (토) - 주말
            'left',
            holidays,
            defaultCalendarSettings
        );

        // 토요일은 휴일이므로 5/3(금)로 스냅
        expect(result.adjustedDeltaDays).toBe(-3);
        expect(result.skippedDays).toBe(1);
    });
});

// ============================================
// applyFinalHolidaySnap 테스트
// ============================================

describe('applyFinalHolidaySnap', () => {
    it('평일이면 조정 없음', () => {
        const date = parseISO('2024-05-02'); // 목요일
        const result = applyFinalHolidaySnap(date, 'right', holidays, defaultCalendarSettings);

        expect(result.adjustedDate).toEqual(date);
        expect(result.adjustment).toBe(0);
    });

    it('휴일이면 right 방향으로 스냅', () => {
        const date = parseISO('2024-05-01'); // 근로자의날
        const result = applyFinalHolidaySnap(date, 'right', holidays, defaultCalendarSettings);

        expect(result.adjustedDate).toEqual(parseISO('2024-05-02'));
        expect(result.adjustment).toBe(1);
    });

    it('휴일이면 left 방향으로 스냅', () => {
        const date = parseISO('2024-05-04'); // 토요일
        const result = applyFinalHolidaySnap(date, 'left', holidays, defaultCalendarSettings);

        expect(result.adjustedDate).toEqual(parseISO('2024-05-03'));
        expect(result.adjustment).toBe(-1);
    });
});

// ============================================
// calculateWorkingDaysOffsets 테스트
// ============================================

describe('calculateWorkingDaysOffsets', () => {
    it('빈 배열이면 null과 빈 Map 반환', () => {
        const result = calculateWorkingDaysOffsets([], holidays, defaultCalendarSettings);

        expect(result.referenceTask).toBeNull();
        expect(result.workingDaysOffsets.size).toBe(0);
    });

    it('단일 Task는 오프셋 0', () => {
        const tasks = [createMockTask('1', '2024-05-02', '2024-05-03', { indirectWorkDaysPre: 0, netWorkDays: 2, indirectWorkDaysPost: 0 })];
        const result = calculateWorkingDaysOffsets(tasks, holidays, defaultCalendarSettings);

        expect(result.referenceTask).toEqual(tasks[0]);
        expect(result.workingDaysOffsets.get('1')).toBe(0);
    });

    it('여러 Task의 작업일 오프셋 계산', () => {
        const tasks = [
            createMockTask('1', '2024-05-02', '2024-05-03', { indirectWorkDaysPre: 0, netWorkDays: 2, indirectWorkDaysPost: 0 }),
            createMockTask('2', '2024-05-06', '2024-05-07', { indirectWorkDaysPre: 0, netWorkDays: 2, indirectWorkDaysPost: 0 }), // 5/2 ~ 5/6: 주말(5/4,5/5) 제외 2작업일
        ];
        const result = calculateWorkingDaysOffsets(tasks, holidays, defaultCalendarSettings);

        expect(result.referenceTask?.id).toBe('1'); // 가장 빠른 시작일
        expect(result.workingDaysOffsets.get('1')).toBe(0);
        expect(result.workingDaysOffsets.get('2')).toBe(2); // 5/2→5/3→5/6 (2작업일)
    });

    it('GROUP/MILESTONE 타입은 제외', () => {
        const tasks: ConstructionTask[] = [
            createMockTask('1', '2024-05-02', '2024-05-03', { indirectWorkDaysPre: 0, netWorkDays: 2, indirectWorkDaysPost: 0 }),
            {
                id: '2',
                name: 'Group',
                type: 'GROUP',
                wbsLevel: 1,
                startDate: parseISO('2024-05-01'),
                endDate: parseISO('2024-05-10'),
            },
        ];
        const result = calculateWorkingDaysOffsets(tasks, holidays, defaultCalendarSettings);

        expect(result.workingDaysOffsets.size).toBe(1);
        expect(result.workingDaysOffsets.has('2')).toBe(false);
    });
});

// ============================================
// calculateTaskMoveResult 테스트
// ============================================

describe('calculateTaskMoveResult', () => {
    it('평일로 이동 시 정상 계산', () => {
        const originalStartDate = parseISO('2024-05-02'); // 목요일
        const result = calculateTaskMoveResult(
            originalStartDate,
            0, // indirectWorkDaysPre
            3, // netWorkDays
            0, // indirectWorkDaysPost
            1, // deltaDays: 5/3 (금)
            'right',
            holidays,
            defaultCalendarSettings
        );

        expect(result.newStartDate).toEqual(parseISO('2024-05-03'));
        // 5/3(금)부터 3작업일: 5/3, 5/6, 5/7 → 5/7 종료
        expect(result.newEndDate).toEqual(parseISO('2024-05-07'));
    });

    it('휴일로 이동 시 스냅 후 종료일 재계산', () => {
        const originalStartDate = parseISO('2024-05-03'); // 금요일
        const result = calculateTaskMoveResult(
            originalStartDate,
            0, // indirectWorkDaysPre
            3, // netWorkDays
            0, // indirectWorkDaysPost
            1, // deltaDays: 5/4 (토) → 5/6 (월)로 스냅
            'right',
            holidays,
            defaultCalendarSettings
        );

        expect(result.newStartDate).toEqual(parseISO('2024-05-06')); // 주말 스냅
        // 5/6(월)부터 3작업일: 5/6, 5/7, 5/8 → 5/8 종료
        expect(result.newEndDate).toEqual(parseISO('2024-05-08'));
    });

    it('선간접/후간접 포함 계산', () => {
        const originalStartDate = parseISO('2024-05-06'); // 월요일
        const result = calculateTaskMoveResult(
            originalStartDate,
            2, // indirectWorkDaysPre: 달력일 기준
            3, // netWorkDays: 작업일 기준
            2, // indirectWorkDaysPost: 달력일 기준
            0, // deltaDays: 이동 없음
            'right',
            holidays,
            defaultCalendarSettings
        );

        expect(result.newStartDate).toEqual(parseISO('2024-05-06'));
        // 선간접: 5/6 + 2일 = 5/8
        // 순작업: 5/8부터 3작업일 = 5/8, 5/9, 5/10 → 5/10
        // 후간접: 5/11 + (2-1)일 = 5/12
        expect(result.newEndDate).toEqual(parseISO('2024-05-12'));
    });
});

// ============================================
// calculateEndDateFromStart 테스트
// ============================================

describe('calculateEndDateFromStart', () => {
    it('순작업만 있을 때', () => {
        const startDate = parseISO('2024-05-06'); // 월요일
        const result = calculateEndDateFromStart(
            startDate,
            0, // indirectWorkDaysPre
            5, // netWorkDays
            0, // indirectWorkDaysPost
            holidays,
            defaultCalendarSettings
        );

        // 5/6(월)부터 5작업일: 5/6, 5/7, 5/8, 5/9, 5/10 → 5/10 종료
        expect(result).toEqual(parseISO('2024-05-10'));
    });

    it('선간접 + 순작업', () => {
        const startDate = parseISO('2024-05-06'); // 월요일
        const result = calculateEndDateFromStart(
            startDate,
            2, // indirectWorkDaysPre: 5/6 + 2 = 5/8
            3, // netWorkDays
            0, // indirectWorkDaysPost
            holidays,
            defaultCalendarSettings
        );

        // 선간접: 5/6 + 2 = 5/8
        // 순작업: 5/8부터 3작업일 = 5/8, 5/9, 5/10 → 5/10
        expect(result).toEqual(parseISO('2024-05-10'));
    });

    it('선간접 + 순작업 + 후간접', () => {
        const startDate = parseISO('2024-05-06'); // 월요일
        const result = calculateEndDateFromStart(
            startDate,
            1, // indirectWorkDaysPre: 5/6 + 1 = 5/7
            2, // netWorkDays
            3, // indirectWorkDaysPost
            holidays,
            defaultCalendarSettings
        );

        // 선간접: 5/6 + 1 = 5/7
        // 순작업: 5/7부터 2작업일 = 5/7, 5/8 → 5/8
        // 후간접: 5/9 + (3-1) = 5/11
        expect(result).toEqual(parseISO('2024-05-11'));
    });
});

// ============================================
// calculateDeltaWorkingDays 테스트
// ============================================

describe('calculateDeltaWorkingDays', () => {
    const pixelsPerDay = 20;

    it('0 픽셀은 0 작업일', () => {
        const result = calculateDeltaWorkingDays(
            0,
            pixelsPerDay,
            parseISO('2024-05-06'),
            holidays,
            defaultCalendarSettings
        );
        expect(result).toBe(0);
    });

    it('오른쪽 이동 시 작업일 계산', () => {
        const baseDate = parseISO('2024-05-06'); // 월요일
        const result = calculateDeltaWorkingDays(
            100, // 5일치 픽셀
            pixelsPerDay,
            baseDate,
            holidays,
            defaultCalendarSettings
        );

        // 5/6 ~ 5/11: 5/6, 5/7, 5/8, 5/9, 5/10 (5작업일, 5/11은 토요일)
        expect(result).toBe(5);
    });

    it('왼쪽 이동 시 음수 작업일', () => {
        const baseDate = parseISO('2024-05-10'); // 금요일
        const result = calculateDeltaWorkingDays(
            -80, // -4일치 픽셀 → 5/6(월)
            pixelsPerDay,
            baseDate,
            holidays,
            defaultCalendarSettings
        );

        // 5/6 ~ 5/10: 5작업일이지만 왼쪽이므로 음수
        expect(result).toBe(-4);
    });
});
