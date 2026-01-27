import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import {
    isTaskWithDetails,
    isTaskWithCP,
    isGroupTask,
    isCPTask,
    isRegularTask,
    isValidDate,
    isValidMilestone,
    isValidDependency,
    isLevel1Task,
    isLevel2Task,
    isRootTask,
    isNonEmptyArray,
} from '../typeGuards';
import type { ConstructionTask } from '../../types';

describe('typeGuards', () => {
    const createBaseTask = (overrides: Partial<ConstructionTask> = {}): ConstructionTask => ({
        id: 'task1',
        parentId: 'cp1',
        wbsLevel: 2,
        type: 'TASK',
        name: 'Test Task',
        startDate: parseISO('2024-05-06'),
        endDate: parseISO('2024-05-10'),
        dependencies: [],
        ...overrides,
    });

    describe('isTaskWithDetails', () => {
        it('should return true for task with task data', () => {
            const task = createBaseTask({
                task: {
                    netWorkDays: 5,
                    indirectWorkDaysPre: 0,
                    indirectWorkDaysPost: 0,
                },
            });
            expect(isTaskWithDetails(task)).toBe(true);
        });

        it('should return false for task without task data', () => {
            const task = createBaseTask();
            expect(isTaskWithDetails(task)).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isTaskWithDetails(null)).toBe(false);
            expect(isTaskWithDetails(undefined)).toBe(false);
        });
    });

    describe('isTaskWithCP', () => {
        it('should return true for task with cp data', () => {
            const task = createBaseTask({
                type: 'CP',
                wbsLevel: 1,
                cp: {
                    workDaysTotal: 10,
                    nonWorkDaysTotal: 2,
                },
            });
            expect(isTaskWithCP(task)).toBe(true);
        });

        it('should return false for task without cp data', () => {
            const task = createBaseTask();
            expect(isTaskWithCP(task)).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isTaskWithCP(null)).toBe(false);
            expect(isTaskWithCP(undefined)).toBe(false);
        });
    });

    describe('isGroupTask', () => {
        it('should return true for GROUP type task', () => {
            const task = createBaseTask({ type: 'GROUP' });
            expect(isGroupTask(task)).toBe(true);
        });

        it('should return false for non-GROUP type task', () => {
            const task = createBaseTask({ type: 'TASK' });
            expect(isGroupTask(task)).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isGroupTask(null)).toBe(false);
            expect(isGroupTask(undefined)).toBe(false);
        });
    });

    describe('isCPTask', () => {
        it('should return true for CP type task', () => {
            const task = createBaseTask({ type: 'CP' });
            expect(isCPTask(task)).toBe(true);
        });

        it('should return false for non-CP type task', () => {
            const task = createBaseTask({ type: 'TASK' });
            expect(isCPTask(task)).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isCPTask(null)).toBe(false);
            expect(isCPTask(undefined)).toBe(false);
        });
    });

    describe('isRegularTask', () => {
        it('should return true for TASK type', () => {
            const task = createBaseTask({ type: 'TASK' });
            expect(isRegularTask(task)).toBe(true);
        });

        it('should return false for non-TASK type', () => {
            const task = createBaseTask({ type: 'CP' });
            expect(isRegularTask(task)).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isRegularTask(null)).toBe(false);
            expect(isRegularTask(undefined)).toBe(false);
        });
    });

    describe('isValidDate', () => {
        it('should return true for valid date', () => {
            expect(isValidDate(new Date())).toBe(true);
            expect(isValidDate(parseISO('2024-05-06'))).toBe(true);
        });

        it('should return false for invalid date', () => {
            expect(isValidDate(new Date('invalid'))).toBe(false);
        });

        it('should return false for non-date values', () => {
            expect(isValidDate('2024-05-06')).toBe(false);
            expect(isValidDate(123)).toBe(false);
            expect(isValidDate(null)).toBe(false);
            expect(isValidDate(undefined)).toBe(false);
        });
    });

    describe('isValidMilestone', () => {
        it('should return true for valid milestone', () => {
            const milestone = {
                id: 'ms1',
                name: 'Milestone 1',
                date: parseISO('2024-05-06'),
            };
            expect(isValidMilestone(milestone)).toBe(true);
        });

        it('should return false for invalid milestone', () => {
            expect(isValidMilestone({ id: 'ms1' })).toBe(false);
            expect(isValidMilestone({ id: 'ms1', name: 'Test' })).toBe(false);
            expect(isValidMilestone(null)).toBe(false);
            expect(isValidMilestone(undefined)).toBe(false);
        });
    });

    describe('isValidDependency', () => {
        it('should return true for valid dependency', () => {
            const dependency = {
                id: 'dep1',
                predecessorId: 'task1',
                type: 'FS' as const,
            };
            expect(isValidDependency(dependency)).toBe(true);
        });

        it('should return true for all valid dependency types', () => {
            const types = ['FS', 'SS', 'FF', 'SF'] as const;
            types.forEach(type => {
                expect(isValidDependency({ id: 'd1', predecessorId: 't1', type })).toBe(true);
            });
        });

        it('should return false for invalid dependency', () => {
            expect(isValidDependency({ id: 'dep1' })).toBe(false);
            expect(isValidDependency({ id: 'dep1', predecessorId: 't1', type: 'INVALID' as 'FS' })).toBe(false);
            expect(isValidDependency(null)).toBe(false);
            expect(isValidDependency(undefined)).toBe(false);
        });
    });

    describe('isLevel1Task', () => {
        it('should return true for wbsLevel 1', () => {
            const task = createBaseTask({ wbsLevel: 1 });
            expect(isLevel1Task(task)).toBe(true);
        });

        it('should return false for other wbsLevels', () => {
            const task = createBaseTask({ wbsLevel: 2 });
            expect(isLevel1Task(task)).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isLevel1Task(null)).toBe(false);
            expect(isLevel1Task(undefined)).toBe(false);
        });
    });

    describe('isLevel2Task', () => {
        it('should return true for wbsLevel 2', () => {
            const task = createBaseTask({ wbsLevel: 2 });
            expect(isLevel2Task(task)).toBe(true);
        });

        it('should return false for other wbsLevels', () => {
            const task = createBaseTask({ wbsLevel: 1 });
            expect(isLevel2Task(task)).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isLevel2Task(null)).toBe(false);
            expect(isLevel2Task(undefined)).toBe(false);
        });
    });

    describe('isRootTask', () => {
        it('should return true for task with null parentId', () => {
            const task = createBaseTask({ parentId: null });
            expect(isRootTask(task)).toBe(true);
        });

        it('should return false for task with parentId', () => {
            const task = createBaseTask({ parentId: 'cp1' });
            expect(isRootTask(task)).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isRootTask(null)).toBe(false);
            expect(isRootTask(undefined)).toBe(false);
        });
    });

    describe('isNonEmptyArray', () => {
        it('should return true for non-empty array', () => {
            expect(isNonEmptyArray([1, 2, 3])).toBe(true);
            expect(isNonEmptyArray(['a'])).toBe(true);
        });

        it('should return false for empty array', () => {
            expect(isNonEmptyArray([])).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isNonEmptyArray(null)).toBe(false);
            expect(isNonEmptyArray(undefined)).toBe(false);
        });
    });
});
