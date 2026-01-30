import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import {
    buildGroupDependencyGraph,
    detectGroupCyclicDependency,
    wouldCreateGroupCycle,
} from '../dependencyGraph';
import type { ConstructionTask, GroupDependency } from '../../types';

describe('dependencyGraph - Cycle Detection', () => {
    const createGroupTask = (id: string): ConstructionTask => ({
        id,
        parentId: null,
        wbsLevel: 1,
        type: 'GROUP',
        name: `Group ${id}`,
        startDate: parseISO('2025-01-01'),
        endDate: parseISO('2025-01-10'),
        dependencies: [],
    });

    const createGroupDependency = (
        id: string,
        sourceGroupId: string,
        targetGroupId: string
    ): GroupDependency => ({
        id,
        sourceGroupId,
        targetGroupId,
        type: 'FS',
    });

    describe('detectGroupCyclicDependency', () => {
        it('should return no cycle for linear chain A -> B -> C', () => {
            const tasks = [createGroupTask('A'), createGroupTask('B'), createGroupTask('C')];
            const dependencies = [
                createGroupDependency('d1', 'A', 'B'),
                createGroupDependency('d2', 'B', 'C'),
            ];

            const graph = buildGroupDependencyGraph(tasks, dependencies);
            const result = detectGroupCyclicDependency(graph);

            expect(result.hasCycle).toBe(false);
            expect(result.cyclePath).toHaveLength(0);
        });

        it('should detect simple cycle A -> B -> A', () => {
            const tasks = [createGroupTask('A'), createGroupTask('B')];
            const dependencies = [
                createGroupDependency('d1', 'A', 'B'),
                createGroupDependency('d2', 'B', 'A'),
            ];

            const graph = buildGroupDependencyGraph(tasks, dependencies);
            const result = detectGroupCyclicDependency(graph);

            expect(result.hasCycle).toBe(true);
            expect(result.cyclePath.length).toBeGreaterThan(0);
        });

        it('should detect complex cycle A -> B -> C -> A', () => {
            const tasks = [createGroupTask('A'), createGroupTask('B'), createGroupTask('C')];
            const dependencies = [
                createGroupDependency('d1', 'A', 'B'),
                createGroupDependency('d2', 'B', 'C'),
                createGroupDependency('d3', 'C', 'A'),
            ];

            const graph = buildGroupDependencyGraph(tasks, dependencies);
            const result = detectGroupCyclicDependency(graph);

            expect(result.hasCycle).toBe(true);
        });

        it('should return no cycle for disconnected groups', () => {
            const tasks = [createGroupTask('A'), createGroupTask('B'), createGroupTask('C')];
            const dependencies: GroupDependency[] = [];

            const graph = buildGroupDependencyGraph(tasks, dependencies);
            const result = detectGroupCyclicDependency(graph);

            expect(result.hasCycle).toBe(false);
        });

        it('should handle self-referencing dependency', () => {
            const tasks = [createGroupTask('A')];
            const dependencies = [createGroupDependency('d1', 'A', 'A')];

            const graph = buildGroupDependencyGraph(tasks, dependencies);
            const result = detectGroupCyclicDependency(graph);

            expect(result.hasCycle).toBe(true);
        });

        it('should return no cycle for tree structure', () => {
            const tasks = [
                createGroupTask('root'),
                createGroupTask('child1'),
                createGroupTask('child2'),
                createGroupTask('grandchild1'),
            ];
            const dependencies = [
                createGroupDependency('d1', 'root', 'child1'),
                createGroupDependency('d2', 'root', 'child2'),
                createGroupDependency('d3', 'child1', 'grandchild1'),
            ];

            const graph = buildGroupDependencyGraph(tasks, dependencies);
            const result = detectGroupCyclicDependency(graph);

            expect(result.hasCycle).toBe(false);
        });
    });

    describe('wouldCreateGroupCycle', () => {
        it('should return false when adding non-cyclic dependency', () => {
            const tasks = [createGroupTask('A'), createGroupTask('B'), createGroupTask('C')];
            const existingDependencies = [createGroupDependency('d1', 'A', 'B')];

            // B -> C를 추가해도 순환 아님
            const result = wouldCreateGroupCycle('B', 'C', tasks, existingDependencies);
            expect(result).toBe(false);
        });

        it('should return true when adding would create cycle', () => {
            const tasks = [createGroupTask('A'), createGroupTask('B'), createGroupTask('C')];
            const existingDependencies = [
                createGroupDependency('d1', 'A', 'B'),
                createGroupDependency('d2', 'B', 'C'),
            ];

            // C -> A를 추가하면 순환 발생
            const result = wouldCreateGroupCycle('C', 'A', tasks, existingDependencies);
            expect(result).toBe(true);
        });

        it('should return true for direct reverse dependency', () => {
            const tasks = [createGroupTask('A'), createGroupTask('B')];
            const existingDependencies = [createGroupDependency('d1', 'A', 'B')];

            // B -> A를 추가하면 순환 발생
            const result = wouldCreateGroupCycle('B', 'A', tasks, existingDependencies);
            expect(result).toBe(true);
        });

        it('should return false when no existing dependencies', () => {
            const tasks = [createGroupTask('A'), createGroupTask('B')];
            const existingDependencies: GroupDependency[] = [];

            const result = wouldCreateGroupCycle('A', 'B', tasks, existingDependencies);
            expect(result).toBe(false);
        });
    });
});
