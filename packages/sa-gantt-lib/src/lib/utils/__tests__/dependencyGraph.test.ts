import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import {
    buildDependencyGraph,
    detectCyclicDependency,
    wouldCreateCycle,
} from '../dependencyGraph';
import type { ConstructionTask, AnchorDependency } from '../../types';

describe('dependencyGraph - Cycle Detection', () => {
    const createTask = (id: string): ConstructionTask => ({
        id,
        parentId: 'cp1',
        wbsLevel: 2,
        type: 'TASK',
        name: `Task ${id}`,
        startDate: parseISO('2025-01-01'),
        endDate: parseISO('2025-01-10'),
        dependencies: [],
        task: {
            netWorkDays: 5,
            indirectWorkDaysPre: 0,
            indirectWorkDaysPost: 0,
        },
    });

    const createDependency = (
        id: string,
        sourceTaskId: string,
        targetTaskId: string
    ): AnchorDependency => ({
        id,
        sourceTaskId,
        targetTaskId,
        sourceDayIndex: 0,
        targetDayIndex: 0,
    });

    describe('detectCyclicDependency', () => {
        it('should return no cycle for linear chain A -> B -> C', () => {
            const tasks = [createTask('A'), createTask('B'), createTask('C')];
            const dependencies = [
                createDependency('d1', 'A', 'B'),
                createDependency('d2', 'B', 'C'),
            ];

            const graph = buildDependencyGraph(tasks, dependencies);
            const result = detectCyclicDependency(graph);

            expect(result.hasCycle).toBe(false);
            expect(result.cyclePath).toHaveLength(0);
        });

        it('should detect simple cycle A -> B -> A', () => {
            const tasks = [createTask('A'), createTask('B')];
            const dependencies = [
                createDependency('d1', 'A', 'B'),
                createDependency('d2', 'B', 'A'),
            ];

            const graph = buildDependencyGraph(tasks, dependencies);
            const result = detectCyclicDependency(graph);

            expect(result.hasCycle).toBe(true);
            expect(result.cyclePath.length).toBeGreaterThan(0);
        });

        it('should detect complex cycle A -> B -> C -> A', () => {
            const tasks = [createTask('A'), createTask('B'), createTask('C')];
            const dependencies = [
                createDependency('d1', 'A', 'B'),
                createDependency('d2', 'B', 'C'),
                createDependency('d3', 'C', 'A'),
            ];

            const graph = buildDependencyGraph(tasks, dependencies);
            const result = detectCyclicDependency(graph);

            expect(result.hasCycle).toBe(true);
        });

        it('should return no cycle for disconnected tasks', () => {
            const tasks = [createTask('A'), createTask('B'), createTask('C')];
            const dependencies: AnchorDependency[] = [];

            const graph = buildDependencyGraph(tasks, dependencies);
            const result = detectCyclicDependency(graph);

            expect(result.hasCycle).toBe(false);
        });

        it('should handle self-referencing dependency', () => {
            const tasks = [createTask('A')];
            const dependencies = [createDependency('d1', 'A', 'A')];

            const graph = buildDependencyGraph(tasks, dependencies);
            const result = detectCyclicDependency(graph);

            expect(result.hasCycle).toBe(true);
        });

        it('should return no cycle for tree structure', () => {
            const tasks = [
                createTask('root'),
                createTask('child1'),
                createTask('child2'),
                createTask('grandchild1'),
            ];
            const dependencies = [
                createDependency('d1', 'root', 'child1'),
                createDependency('d2', 'root', 'child2'),
                createDependency('d3', 'child1', 'grandchild1'),
            ];

            const graph = buildDependencyGraph(tasks, dependencies);
            const result = detectCyclicDependency(graph);

            expect(result.hasCycle).toBe(false);
        });
    });

    describe('wouldCreateCycle', () => {
        it('should return false when adding non-cyclic dependency', () => {
            const tasks = [createTask('A'), createTask('B'), createTask('C')];
            const existingDependencies = [createDependency('d1', 'A', 'B')];

            // B -> C를 추가해도 순환 아님
            const result = wouldCreateCycle('B', 'C', tasks, existingDependencies);
            expect(result).toBe(false);
        });

        it('should return true when adding would create cycle', () => {
            const tasks = [createTask('A'), createTask('B'), createTask('C')];
            const existingDependencies = [
                createDependency('d1', 'A', 'B'),
                createDependency('d2', 'B', 'C'),
            ];

            // C -> A를 추가하면 순환 발생
            const result = wouldCreateCycle('C', 'A', tasks, existingDependencies);
            expect(result).toBe(true);
        });

        it('should return true for direct reverse dependency', () => {
            const tasks = [createTask('A'), createTask('B')];
            const existingDependencies = [createDependency('d1', 'A', 'B')];

            // B -> A를 추가하면 순환 발생
            const result = wouldCreateCycle('B', 'A', tasks, existingDependencies);
            expect(result).toBe(true);
        });

        it('should return false when no existing dependencies', () => {
            const tasks = [createTask('A'), createTask('B')];
            const existingDependencies: AnchorDependency[] = [];

            const result = wouldCreateCycle('A', 'B', tasks, existingDependencies);
            expect(result).toBe(false);
        });
    });
});
