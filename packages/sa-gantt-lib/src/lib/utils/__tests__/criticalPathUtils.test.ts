import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import { calculateCriticalPath, formatCriticalPathSummary } from '../criticalPathUtils';
import type { ConstructionTask, CalendarSettings } from '../../types';

describe('criticalPathUtils', () => {
    const calendarSettings: CalendarSettings = {
        workOnSaturdays: false,
        workOnSundays: false,
        workOnHolidays: false,
    };

    const holidays: Date[] = [
        parseISO('2024-06-06'), // 현충일
    ];

    describe('calculateCriticalPath', () => {
        it('should return empty summary for empty tasks', () => {
            const result = calculateCriticalPath([], holidays, calendarSettings);
            expect(result.totalDays).toBe(0);
            expect(result.workDays).toBe(0);
            expect(result.nonWorkDays).toBe(0);
        });

        it('should calculate critical path for single task', () => {
            const tasks: ConstructionTask[] = [
                {
                    id: 'task1',
                    parentId: 'cp1',
                    wbsLevel: 2,
                    type: 'TASK',
                    name: 'Task 1',
                    startDate: parseISO('2024-05-06'), // 월요일
                    endDate: parseISO('2024-05-10'), // 금요일
                    task: {
                        netWorkDays: 5,
                        indirectWorkDaysPre: 0,
                        indirectWorkDaysPost: 0,
                    },
                    dependencies: [],
                },
            ];

            const result = calculateCriticalPath(tasks, [], calendarSettings);
            expect(result.totalDays).toBe(5);
            expect(result.workDays).toBeGreaterThan(0);
        });

        it('should calculate critical path for multiple overlapping tasks', () => {
            const tasks: ConstructionTask[] = [
                {
                    id: 'task1',
                    parentId: 'cp1',
                    wbsLevel: 2,
                    type: 'TASK',
                    name: 'Task 1',
                    startDate: parseISO('2024-05-06'), // 월요일
                    endDate: parseISO('2024-05-10'), // 금요일
                    task: {
                        netWorkDays: 5,
                        indirectWorkDaysPre: 0,
                        indirectWorkDaysPost: 0,
                    },
                    dependencies: [],
                },
                {
                    id: 'task2',
                    parentId: 'cp1',
                    wbsLevel: 2,
                    type: 'TASK',
                    name: 'Task 2',
                    startDate: parseISO('2024-05-08'), // 수요일
                    endDate: parseISO('2024-05-14'), // 화요일
                    task: {
                        netWorkDays: 5,
                        indirectWorkDaysPre: 0,
                        indirectWorkDaysPost: 0,
                    },
                    dependencies: [],
                },
            ];

            const result = calculateCriticalPath(tasks, [], calendarSettings);
            // calculateDualCalendarDates가 netWorkDays 기준으로 날짜 계산
            // 전체 기간은 실제 계산된 시작/종료일 기준
            expect(result.totalDays).toBeGreaterThan(0);
            expect(result.workDays).toBeGreaterThan(0);
        });

        it('should calculate work and non-work days correctly', () => {
            const tasks: ConstructionTask[] = [
                {
                    id: 'task1',
                    parentId: 'cp1',
                    wbsLevel: 2,
                    type: 'TASK',
                    name: 'Task 1',
                    startDate: parseISO('2024-05-06'), // 월요일
                    endDate: parseISO('2024-05-10'), // 금요일 (5 순작업일)
                    task: {
                        netWorkDays: 5,
                        indirectWorkDaysPre: 0,
                        indirectWorkDaysPost: 0,
                    },
                    dependencies: [],
                },
            ];

            const result = calculateCriticalPath(tasks, [], calendarSettings);
            // netWorkDays=5, 월요일 시작 → 금요일 종료
            expect(result.totalDays).toBe(5);
            expect(result.workDays).toBe(5); // 월~금
            expect(result.nonWorkDays).toBe(0); // 주말 제외
        });

        it('should include indirect work days in calculation', () => {
            const tasks: ConstructionTask[] = [
                {
                    id: 'task1',
                    parentId: 'cp1',
                    wbsLevel: 2,
                    type: 'TASK',
                    name: 'Task 1',
                    startDate: parseISO('2024-05-06'),
                    endDate: parseISO('2024-05-10'),
                    task: {
                        netWorkDays: 3,
                        indirectWorkDaysPre: 1,
                        indirectWorkDaysPost: 1,
                    },
                    dependencies: [],
                },
            ];

            const result = calculateCriticalPath(tasks, [], calendarSettings);
            // 간접작업일은 비작업일로 계산됨 (순작업일만 작업일)
            expect(result.totalDays).toBeGreaterThan(0);
            expect(result.netWorkDaysTotal).toBe(3);
            expect(result.indirectWorkDaysTotal).toBe(2); // pre(1) + post(1)
        });
    });

    describe('formatCriticalPathSummary', () => {
        it('should format summary correctly', () => {
            const tasks: ConstructionTask[] = [
                {
                    id: 'task1',
                    parentId: 'cp1',
                    wbsLevel: 2,
                    type: 'TASK',
                    name: 'Task 1',
                    startDate: parseISO('2024-05-06'),
                    endDate: parseISO('2024-05-12'),
                    task: {
                        netWorkDays: 5,
                        indirectWorkDaysPre: 0,
                        indirectWorkDaysPost: 0,
                    },
                    dependencies: [],
                },
            ];

            const summary = calculateCriticalPath(tasks, [], calendarSettings);
            const formatted = formatCriticalPathSummary(summary);

            expect(formatted).toContain('총');
            expect(formatted).toContain('작업');
            expect(formatted).toContain('비작업');
        });

        it('should format zero days summary', () => {
            const summary = { totalDays: 0, workDays: 0, nonWorkDays: 0 };
            const formatted = formatCriticalPathSummary(summary);
            // 0일이어도 포맷팅된 문자열 반환
            expect(formatted).toContain('0일');
        });
    });
});
