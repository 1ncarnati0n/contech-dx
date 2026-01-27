import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import {
    shallowEqualTasks,
    shallowEqualMilestones,
    shallowEqual,
    shallowEqualHistoryState,
} from '../comparisonUtils';
import type { ConstructionTask, Milestone } from '../../types';

describe('comparisonUtils', () => {
    const createTask = (id: string, overrides: Partial<ConstructionTask> = {}): ConstructionTask => ({
        id,
        parentId: 'cp1',
        wbsLevel: 2,
        type: 'TASK',
        name: `Task ${id}`,
        startDate: parseISO('2024-05-06'),
        endDate: parseISO('2024-05-10'),
        dependencies: [],
        ...overrides,
    });

    const createMilestone = (id: string, overrides: Partial<Milestone> = {}): Milestone => ({
        id,
        name: `Milestone ${id}`,
        date: parseISO('2024-05-06'),
        ...overrides,
    });

    describe('shallowEqualTasks', () => {
        it('should return true for same reference', () => {
            const tasks = [createTask('1')];
            expect(shallowEqualTasks(tasks, tasks)).toBe(true);
        });

        it('should return true for identical task arrays', () => {
            const tasks1 = [createTask('1'), createTask('2')];
            const tasks2 = [createTask('1'), createTask('2')];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(true);
        });

        it('should return false for different lengths', () => {
            const tasks1 = [createTask('1')];
            const tasks2 = [createTask('1'), createTask('2')];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should return false for different task ids', () => {
            const tasks1 = [createTask('1')];
            const tasks2 = [createTask('2')];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should return false for different task names', () => {
            const tasks1 = [createTask('1', { name: 'Task A' })];
            const tasks2 = [createTask('1', { name: 'Task B' })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should return false for different parentIds', () => {
            const tasks1 = [createTask('1', { parentId: 'cp1' })];
            const tasks2 = [createTask('1', { parentId: 'cp2' })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should return false for different types', () => {
            const tasks1 = [createTask('1', { type: 'TASK' })];
            const tasks2 = [createTask('1', { type: 'GROUP' })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should return false for different wbsLevels', () => {
            const tasks1 = [createTask('1', { wbsLevel: 1 })];
            const tasks2 = [createTask('1', { wbsLevel: 2 })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should return false for different startDates', () => {
            const tasks1 = [createTask('1', { startDate: parseISO('2024-05-06') })];
            const tasks2 = [createTask('1', { startDate: parseISO('2024-05-07') })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should return false for different endDates', () => {
            const tasks1 = [createTask('1', { endDate: parseISO('2024-05-10') })];
            const tasks2 = [createTask('1', { endDate: parseISO('2024-05-11') })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should handle null/undefined correctly', () => {
            const tasks = [createTask('1')];
            expect(shallowEqualTasks(null, tasks)).toBe(false);
            expect(shallowEqualTasks(tasks, null)).toBe(false);
            expect(shallowEqualTasks(null, null)).toBe(true);
            expect(shallowEqualTasks(undefined, undefined)).toBe(true);
        });

        it('should compare CP data correctly', () => {
            const cpData = { workDaysTotal: 10, nonWorkDaysTotal: 2 };
            const tasks1 = [createTask('1', { cp: cpData })];
            const tasks2 = [createTask('1', { cp: { ...cpData } })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(true);

            const tasks3 = [createTask('1', { cp: { workDaysTotal: 15, nonWorkDaysTotal: 2 } })];
            expect(shallowEqualTasks(tasks1, tasks3)).toBe(false);
        });

        it('should return false when one has cp and other does not', () => {
            const tasks1 = [createTask('1', { cp: { workDaysTotal: 10, nonWorkDaysTotal: 2 } })];
            const tasks2 = [createTask('1')];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });

        it('should compare task data correctly', () => {
            const taskData = { netWorkDays: 5, indirectWorkDaysPre: 1, indirectWorkDaysPost: 1 };
            const tasks1 = [createTask('1', { task: taskData })];
            const tasks2 = [createTask('1', { task: { ...taskData } })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(true);

            const tasks3 = [createTask('1', { task: { ...taskData, netWorkDays: 10 } })];
            expect(shallowEqualTasks(tasks1, tasks3)).toBe(false);
        });

        it('should compare dependencies length', () => {
            const tasks1 = [createTask('1', { dependencies: [{ id: 'd1', predecessorId: 't0', type: 'FS' }] })];
            const tasks2 = [createTask('1', { dependencies: [] })];
            expect(shallowEqualTasks(tasks1, tasks2)).toBe(false);
        });
    });

    describe('shallowEqualMilestones', () => {
        it('should return true for same reference', () => {
            const milestones = [createMilestone('1')];
            expect(shallowEqualMilestones(milestones, milestones)).toBe(true);
        });

        it('should return true for identical milestone arrays', () => {
            const ms1 = [createMilestone('1'), createMilestone('2')];
            const ms2 = [createMilestone('1'), createMilestone('2')];
            expect(shallowEqualMilestones(ms1, ms2)).toBe(true);
        });

        it('should return false for different lengths', () => {
            const ms1 = [createMilestone('1')];
            const ms2 = [createMilestone('1'), createMilestone('2')];
            expect(shallowEqualMilestones(ms1, ms2)).toBe(false);
        });

        it('should return false for different ids', () => {
            const ms1 = [createMilestone('1')];
            const ms2 = [createMilestone('2')];
            expect(shallowEqualMilestones(ms1, ms2)).toBe(false);
        });

        it('should return false for different names', () => {
            const ms1 = [createMilestone('1', { name: 'A' })];
            const ms2 = [createMilestone('1', { name: 'B' })];
            expect(shallowEqualMilestones(ms1, ms2)).toBe(false);
        });

        it('should return false for different dates', () => {
            const ms1 = [createMilestone('1', { date: parseISO('2024-05-06') })];
            const ms2 = [createMilestone('1', { date: parseISO('2024-05-07') })];
            expect(shallowEqualMilestones(ms1, ms2)).toBe(false);
        });

        it('should return false for different descriptions', () => {
            const ms1 = [createMilestone('1', { description: 'Desc A' })];
            const ms2 = [createMilestone('1', { description: 'Desc B' })];
            expect(shallowEqualMilestones(ms1, ms2)).toBe(false);
        });

        it('should handle null/undefined correctly', () => {
            const ms = [createMilestone('1')];
            expect(shallowEqualMilestones(null, ms)).toBe(false);
            expect(shallowEqualMilestones(ms, null)).toBe(false);
            expect(shallowEqualMilestones(null, null)).toBe(true);
        });
    });

    describe('shallowEqual', () => {
        it('should return true for same reference', () => {
            const obj = { a: 1, b: 2 };
            expect(shallowEqual(obj, obj)).toBe(true);
        });

        it('should return true for equal objects', () => {
            const obj1 = { a: 1, b: 'test' };
            const obj2 = { a: 1, b: 'test' };
            expect(shallowEqual(obj1, obj2)).toBe(true);
        });

        it('should return false for different values', () => {
            const obj1 = { a: 1 };
            const obj2 = { a: 2 };
            expect(shallowEqual(obj1, obj2)).toBe(false);
        });

        it('should return false for different keys', () => {
            const obj1 = { a: 1 } as Record<string, unknown>;
            const obj2 = { b: 1 } as Record<string, unknown>;
            expect(shallowEqual(obj1, obj2)).toBe(false);
        });

        it('should return false for different key counts', () => {
            const obj1 = { a: 1 } as Record<string, unknown>;
            const obj2 = { a: 1, b: 2 } as Record<string, unknown>;
            expect(shallowEqual(obj1, obj2)).toBe(false);
        });

        it('should handle null/undefined correctly', () => {
            expect(shallowEqual(null, { a: 1 })).toBe(false);
            expect(shallowEqual({ a: 1 }, null)).toBe(false);
            expect(shallowEqual(null, null)).toBe(true);
        });
    });

    describe('shallowEqualHistoryState', () => {
        it('should return true for same reference', () => {
            const state = { tasks: [createTask('1')], milestones: [createMilestone('1')] };
            expect(shallowEqualHistoryState(state, state)).toBe(true);
        });

        it('should return true for equal states', () => {
            const state1 = { tasks: [createTask('1')], milestones: [createMilestone('1')] };
            const state2 = { tasks: [createTask('1')], milestones: [createMilestone('1')] };
            expect(shallowEqualHistoryState(state1, state2)).toBe(true);
        });

        it('should return false for different tasks', () => {
            const state1 = { tasks: [createTask('1')] };
            const state2 = { tasks: [createTask('2')] };
            expect(shallowEqualHistoryState(state1, state2)).toBe(false);
        });

        it('should return false for different milestones', () => {
            const state1 = { milestones: [createMilestone('1')] };
            const state2 = { milestones: [createMilestone('2')] };
            expect(shallowEqualHistoryState(state1, state2)).toBe(false);
        });

        it('should compare other keys by reference', () => {
            const state1 = { tasks: [], extra: 'value1' };
            const state2 = { tasks: [], extra: 'value2' };
            expect(shallowEqualHistoryState(state1, state2)).toBe(false);
        });

        it('should return false for different key counts', () => {
            const state1 = { tasks: [] } as { tasks: ConstructionTask[], extra?: string };
            const state2 = { tasks: [], extra: 'value' };
            expect(shallowEqualHistoryState(state1, state2)).toBe(false);
        });
    });
});
