import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import { collectDescendantTasks, calculateGroupDateRange } from '../groupUtils';
import type { ConstructionTask } from '../../types';

describe('groupUtils', () => {
    const createTask = (
        id: string,
        parentId: string | null,
        type: 'CP' | 'GROUP' | 'TASK',
        startDate: string,
        endDate: string
    ): ConstructionTask => ({
        id,
        parentId,
        wbsLevel: type === 'CP' ? 1 : 2,
        type,
        name: `Task ${id}`,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
        dependencies: [],
        task: type === 'TASK' ? {
            netWorkDays: 5,
            indirectWorkDaysPre: 0,
            indirectWorkDaysPost: 0,
        } : undefined,
    });

    describe('collectDescendantTasks', () => {
        it('should collect direct children', () => {
            const tasks: ConstructionTask[] = [
                createTask('cp1', null, 'CP', '2024-05-01', '2024-05-31'),
                createTask('task1', 'cp1', 'TASK', '2024-05-01', '2024-05-10'),
                createTask('task2', 'cp1', 'TASK', '2024-05-11', '2024-05-20'),
            ];

            const result = collectDescendantTasks('cp1', tasks);
            expect(result).toHaveLength(2);
            expect(result.map(t => t.id)).toEqual(['task1', 'task2']);
        });

        it('should collect nested descendants through groups', () => {
            const tasks: ConstructionTask[] = [
                createTask('cp1', null, 'CP', '2024-05-01', '2024-05-31'),
                createTask('group1', 'cp1', 'GROUP', '2024-05-01', '2024-05-15'),
                createTask('task1', 'group1', 'TASK', '2024-05-01', '2024-05-10'),
                createTask('task2', 'group1', 'TASK', '2024-05-11', '2024-05-15'),
                createTask('task3', 'cp1', 'TASK', '2024-05-16', '2024-05-20'),
            ];

            const result = collectDescendantTasks('cp1', tasks);
            // collectDescendantTasks는 TASK 타입만 수집 (GROUP은 제외)
            // task1 + task2 (group1 하위) + task3 (cp1 직속) = 3
            expect(result).toHaveLength(3);
            expect(result.map(t => t.id)).toContain('task1');
            expect(result.map(t => t.id)).toContain('task2');
            expect(result.map(t => t.id)).toContain('task3');
        });

        it('should collect deeply nested descendants', () => {
            const tasks: ConstructionTask[] = [
                createTask('cp1', null, 'CP', '2024-05-01', '2024-05-31'),
                createTask('group1', 'cp1', 'GROUP', '2024-05-01', '2024-05-31'),
                createTask('group2', 'group1', 'GROUP', '2024-05-01', '2024-05-15'),
                createTask('task1', 'group2', 'TASK', '2024-05-01', '2024-05-10'),
            ];

            const result = collectDescendantTasks('cp1', tasks);
            // collectDescendantTasks는 TASK 타입만 수집 (GROUP은 제외)
            // group1, group2는 재귀 탐색용이지만 결과에 포함되지 않음
            expect(result).toHaveLength(1);
            expect(result.map(t => t.id)).toContain('task1');
        });

        it('should return empty array for non-existent parent', () => {
            const tasks: ConstructionTask[] = [
                createTask('task1', 'cp1', 'TASK', '2024-05-01', '2024-05-10'),
            ];

            const result = collectDescendantTasks('non-existent', tasks);
            expect(result).toHaveLength(0);
        });
    });

    describe('calculateGroupDateRange', () => {
        it('should calculate date range from child tasks', () => {
            const tasks: ConstructionTask[] = [
                createTask('group1', 'cp1', 'GROUP', '2024-05-01', '2024-05-31'),
                createTask('task1', 'group1', 'TASK', '2024-05-05', '2024-05-10'),
                createTask('task2', 'group1', 'TASK', '2024-05-15', '2024-05-25'),
            ];

            const result = calculateGroupDateRange('group1', tasks);
            expect(result).not.toBeNull();
            expect(result!.startDate.getTime()).toBe(parseISO('2024-05-05').getTime());
            expect(result!.endDate.getTime()).toBe(parseISO('2024-05-25').getTime());
        });

        it('should return null for group with no children', () => {
            const tasks: ConstructionTask[] = [
                createTask('group1', 'cp1', 'GROUP', '2024-05-01', '2024-05-31'),
            ];

            const result = calculateGroupDateRange('group1', tasks);
            expect(result).toBeNull();
        });

        it('should include nested group dates', () => {
            const tasks: ConstructionTask[] = [
                createTask('group1', 'cp1', 'GROUP', '2024-05-01', '2024-05-31'),
                createTask('group2', 'group1', 'GROUP', '2024-05-10', '2024-05-20'),
                createTask('task1', 'group2', 'TASK', '2024-05-12', '2024-05-18'),
                createTask('task2', 'group1', 'TASK', '2024-05-01', '2024-05-05'),
            ];

            const result = calculateGroupDateRange('group1', tasks);
            expect(result).not.toBeNull();
            // task2 시작일(5/1)과 task1 종료일(5/18) 사이
            expect(result!.startDate.getTime()).toBe(parseISO('2024-05-01').getTime());
            expect(result!.endDate.getTime()).toBe(parseISO('2024-05-18').getTime());
        });
    });
});
