import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import {
    isValidDate,
    isValidDateRange,
    validateTaskDates,
    parseDateSafe,
    isSameDay,
} from '../date/validation';
import type { ConstructionTask } from '../../types';

describe('date validation utilities', () => {
    describe('isValidDate', () => {
        it('should return true for valid Date objects', () => {
            expect(isValidDate(new Date())).toBe(true);
            expect(isValidDate(new Date('2025-01-15'))).toBe(true);
            expect(isValidDate(parseISO('2025-01-15'))).toBe(true);
        });

        it('should return false for Invalid Date', () => {
            expect(isValidDate(new Date('invalid'))).toBe(false);
            expect(isValidDate(new Date(NaN))).toBe(false);
        });

        it('should return false for non-Date values', () => {
            expect(isValidDate('2025-01-15')).toBe(false);
            expect(isValidDate(null)).toBe(false);
            expect(isValidDate(undefined)).toBe(false);
            expect(isValidDate(123456789)).toBe(false);
            expect(isValidDate({})).toBe(false);
        });
    });

    describe('isValidDateRange', () => {
        it('should return true for valid ranges (start <= end)', () => {
            const start = parseISO('2025-01-01');
            const end = parseISO('2025-01-31');
            expect(isValidDateRange(start, end)).toBe(true);
        });

        it('should return true when start equals end', () => {
            const date = parseISO('2025-01-15');
            expect(isValidDateRange(date, date)).toBe(true);
        });

        it('should return false when start > end', () => {
            const start = parseISO('2025-01-31');
            const end = parseISO('2025-01-01');
            expect(isValidDateRange(start, end)).toBe(false);
        });

        it('should return false for invalid dates', () => {
            const validDate = parseISO('2025-01-15');
            const invalidDate = new Date('invalid');
            expect(isValidDateRange(invalidDate, validDate)).toBe(false);
            expect(isValidDateRange(validDate, invalidDate)).toBe(false);
            expect(isValidDateRange(invalidDate, invalidDate)).toBe(false);
        });
    });

    describe('validateTaskDates', () => {
        const createTask = (startDate: Date, endDate: Date): ConstructionTask => ({
            id: 'test-task',
            parentId: 'cp1',
            wbsLevel: 2,
            type: 'TASK',
            name: 'Test Task',
            startDate,
            endDate,
            dependencies: [],
            task: {
                netWorkDays: 5,
                indirectWorkDaysPre: 0,
                indirectWorkDaysPost: 0,
            },
        });

        it('should return true for task with valid dates', () => {
            const task = createTask(parseISO('2025-01-01'), parseISO('2025-01-10'));
            expect(validateTaskDates(task)).toBe(true);
        });

        it('should return false for task with invalid date range', () => {
            const task = createTask(parseISO('2025-01-10'), parseISO('2025-01-01'));
            expect(validateTaskDates(task)).toBe(false);
        });
    });

    describe('parseDateSafe', () => {
        it('should parse valid ISO date strings', () => {
            const result = parseDateSafe('2025-01-15');
            expect(result).not.toBeNull();
            expect(result?.getFullYear()).toBe(2025);
            expect(result?.getMonth()).toBe(0); // January
            expect(result?.getDate()).toBe(15);
        });

        it('should parse date strings with time', () => {
            const result = parseDateSafe('2025-01-15T10:30:00');
            expect(result).not.toBeNull();
            expect(result?.getHours()).toBe(10);
        });

        it('should return null for invalid strings', () => {
            expect(parseDateSafe('invalid')).toBeNull();
            expect(parseDateSafe('')).toBeNull();
            expect(parseDateSafe('not-a-date')).toBeNull();
        });

        it('should return null for non-string inputs', () => {
            expect(parseDateSafe(null as unknown as string)).toBeNull();
            expect(parseDateSafe(undefined as unknown as string)).toBeNull();
        });
    });

    describe('isSameDay', () => {
        it('should return true for same day regardless of time', () => {
            const date1 = new Date('2025-01-15T10:00:00');
            const date2 = new Date('2025-01-15T23:59:59');
            expect(isSameDay(date1, date2)).toBe(true);
        });

        it('should return false for different days', () => {
            const date1 = parseISO('2025-01-15');
            const date2 = parseISO('2025-01-16');
            expect(isSameDay(date1, date2)).toBe(false);
        });

        it('should return false for invalid dates', () => {
            const validDate = parseISO('2025-01-15');
            const invalidDate = new Date('invalid');
            expect(isSameDay(invalidDate, validDate)).toBe(false);
            expect(isSameDay(validDate, invalidDate)).toBe(false);
        });
    });
});
