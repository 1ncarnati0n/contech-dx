import { describe, it, expect } from 'vitest';
import { parseISO, addDays } from 'date-fns';
import {
    isHoliday,
    isWeekend,
    addWorkingDays,
    addCalendarDays,
    calculateDualCalendarDates,
    dateToX,
    xToDate,
    calculateDateRange,
} from '../dateUtils';
import type { ConstructionTask, CalendarSettings } from '../../types';

describe('dateUtils', () => {
    const holidays: Date[] = [
        parseISO('2024-05-05'), // 어린이날
        parseISO('2024-06-06'), // 현충일
    ];

    const calendarSettings: CalendarSettings = {
        workOnSaturdays: false,
        workOnSundays: false,
        workOnHolidays: false,
    };

    describe('isHoliday', () => {
        it('should return true for Saturday when workOnSaturdays is false', () => {
            const saturday = parseISO('2024-05-04'); // 토요일
            expect(isHoliday(saturday, [], calendarSettings)).toBe(true);
        });

        it('should return true for Sunday when workOnSundays is false', () => {
            const sunday = parseISO('2024-05-05'); // 일요일
            expect(isHoliday(sunday, [], calendarSettings)).toBe(true);
        });

        it('should return true for a holiday date', () => {
            const holiday = parseISO('2024-05-05');
            expect(isHoliday(holiday, holidays, calendarSettings)).toBe(true);
        });

        it('should return false for a regular weekday', () => {
            const weekday = parseISO('2024-05-07'); // 화요일
            expect(isHoliday(weekday, holidays, calendarSettings)).toBe(false);
        });
    });

    describe('isWeekend', () => {
        it('should return true for Saturday', () => {
            const saturday = parseISO('2024-05-04');
            expect(isWeekend(saturday)).toBe(true);
        });

        it('should return true for Sunday', () => {
            const sunday = parseISO('2024-05-05');
            expect(isWeekend(sunday)).toBe(true);
        });

        it('should return false for weekday', () => {
            const weekday = parseISO('2024-05-07');
            expect(isWeekend(weekday)).toBe(false);
        });
    });

    describe('addWorkingDays', () => {
        it('should add working days skipping weekends', () => {
            const startDate = parseISO('2024-05-06'); // 월요일
            const result = addWorkingDays(startDate, 5, holidays, calendarSettings);
            // 월(1)+화(2)+수(3)+목(4)+금(5) -> 금요일 (5/10)
            expect(result.getDay()).toBe(5); // 금요일
            expect(result.getDate()).toBe(10);
        });

        it('should skip weekends when crossing them', () => {
            const startDate = parseISO('2024-05-03'); // 금요일
            const result = addWorkingDays(startDate, 2, holidays, calendarSettings);
            // 금(1) -> 토일 제외 -> 월(2)
            expect(result.getDay()).toBe(1); // 월요일
            expect(result.getDate()).toBe(6);
        });

        it('should skip holidays', () => {
            const startDate = parseISO('2024-06-05'); // 수요일 (6/6 현충일 전날)
            const result = addWorkingDays(startDate, 2, holidays, calendarSettings);
            // 수(1) -> 목(휴일 6/6 제외) -> 금(2)
            expect(result.getDay()).toBe(5); // 금요일
            expect(result.getDate()).toBe(7);
        });
    });

    describe('addCalendarDays', () => {
        it('should add calendar days including weekends', () => {
            const startDate = parseISO('2024-05-06'); // 월요일
            const result = addCalendarDays(startDate, 5);
            const expected = addDays(startDate, 4); // 5일 = 시작일 + 4일
            expect(result.getTime()).toBe(expected.getTime());
        });
    });

    describe('dateToX', () => {
        it('should convert date to X coordinate', () => {
            const baseDate = parseISO('2024-01-01');
            const targetDate = parseISO('2024-01-11');
            const pixelsPerDay = 10;
            const result = dateToX(targetDate, baseDate, pixelsPerDay);
            expect(result).toBe(100); // 10일 * 10px
        });
    });

    describe('xToDate', () => {
        it('should convert X coordinate to date', () => {
            const baseDate = parseISO('2024-01-01');
            const x = 100;
            const pixelsPerDay = 10;
            const result = xToDate(x, baseDate, pixelsPerDay);
            const expected = parseISO('2024-01-11');
            expect(result.getTime()).toBe(expected.getTime());
        });
    });

    describe('calculateDateRange', () => {
        it('should calculate date range from tasks', () => {
            const tasks: ConstructionTask[] = [
                {
                    id: '1',
                    parentId: null,
                    wbsLevel: 1,
                    type: 'CP',
                    name: 'Task 1',
                    startDate: parseISO('2024-01-01'),
                    endDate: parseISO('2024-01-10'),
                    dependencies: [],
                },
                {
                    id: '2',
                    parentId: null,
                    wbsLevel: 1,
                    type: 'CP',
                    name: 'Task 2',
                    startDate: parseISO('2024-01-15'),
                    endDate: parseISO('2024-01-20'),
                    dependencies: [],
                },
            ];

            const result = calculateDateRange(tasks, [], 5);
            expect(result.minDate.getTime()).toBeLessThanOrEqual(parseISO('2023-12-27').getTime());
            expect(result.maxDate.getTime()).toBeGreaterThanOrEqual(parseISO('2024-01-25').getTime());
        });
    });

    describe('calculateDualCalendarDates', () => {
        it('should calculate dates for Level 2 task with indirect work days', () => {
            const task: ConstructionTask = {
                id: '1',
                parentId: 'cp1',
                wbsLevel: 2,
                type: 'TASK',
                name: 'Task 1',
                startDate: parseISO('2024-05-06'), // 월요일
                endDate: parseISO('2024-05-15'),
                task: {
                    netWorkDays: 5,
                    indirectWorkDaysPre: 2,
                    indirectWorkDaysPost: 2,
                },
                dependencies: [],
            };

            const result = calculateDualCalendarDates(task, holidays, calendarSettings);
            expect(result.startDate).toBeDefined();
            expect(result.endDate).toBeDefined();
            expect(result.netWorkStartDate).toBeDefined();
            expect(result.netWorkEndDate).toBeDefined();
        });
    });
});

