/**
 * 타입 가드 유틸리티 함수들
 * 런타임에서 타입 안전성을 보장하기 위한 함수들
 */

import type {
    ConstructionTask,
    TaskData,
    CPData,
    Milestone,
    Dependency,
} from '../types';

/**
 * TaskData가 있는 ConstructionTask인지 확인
 * Level 2 (Detail View) 작업에 사용
 *
 * @param task - 확인할 task (undefined 허용)
 * @returns task가 존재하고 task.task가 있으면 true
 *
 * @example
 * ```typescript
 * const task = tasks.find(t => t.id === id);
 * if (isTaskWithDetails(task)) {
 *   // task.task는 여기서 안전하게 접근 가능
 *   console.log(task.task.netWorkDays);
 * }
 * ```
 */
export function isTaskWithDetails(
    task: ConstructionTask | undefined | null
): task is ConstructionTask & { task: TaskData } {
    return task !== undefined && task !== null && task.task !== undefined && task.task !== null;
}

/**
 * CPData가 있는 ConstructionTask인지 확인
 * Level 1 (Master View) CP 작업에 사용
 *
 * @param task - 확인할 task (undefined 허용)
 * @returns task가 존재하고 task.cp가 있으면 true
 *
 * @example
 * ```typescript
 * const cpTask = tasks.find(t => t.type === 'CP');
 * if (isTaskWithCP(cpTask)) {
 *   // cpTask.cp는 여기서 안전하게 접근 가능
 *   console.log(cpTask.cp.workDaysTotal);
 * }
 * ```
 */
export function isTaskWithCP(
    task: ConstructionTask | undefined | null
): task is ConstructionTask & { cp: CPData } {
    return task !== undefined && task !== null && task.cp !== undefined && task.cp !== null;
}

/**
 * GROUP 타입의 Task인지 확인
 *
 * @param task - 확인할 task
 * @returns task.type이 'GROUP'이면 true
 */
export function isGroupTask(
    task: ConstructionTask | undefined | null
): task is ConstructionTask & { type: 'GROUP' } {
    return task !== undefined && task !== null && task.type === 'GROUP';
}

/**
 * CP 타입의 Task인지 확인
 *
 * @param task - 확인할 task
 * @returns task.type이 'CP'이면 true
 */
export function isCPTask(
    task: ConstructionTask | undefined | null
): task is ConstructionTask & { type: 'CP' } {
    return task !== undefined && task !== null && task.type === 'CP';
}

/**
 * TASK 타입인지 확인 (일반 작업)
 *
 * @param task - 확인할 task
 * @returns task.type이 'TASK'이면 true
 */
export function isRegularTask(
    task: ConstructionTask | undefined | null
): task is ConstructionTask & { type: 'TASK' } {
    return task !== undefined && task !== null && task.type === 'TASK';
}

/**
 * 유효한 Date 객체인지 확인
 *
 * @param value - 확인할 값
 * @returns 유효한 Date 객체이면 true
 */
export function isValidDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Milestone 객체가 유효한지 확인
 *
 * @param milestone - 확인할 milestone
 * @returns 필수 필드가 모두 있으면 true
 */
export function isValidMilestone(
    milestone: Partial<Milestone> | undefined | null
): milestone is Milestone {
    return (
        milestone !== undefined &&
        milestone !== null &&
        typeof milestone.id === 'string' &&
        typeof milestone.name === 'string' &&
        isValidDate(milestone.date)
    );
}

/**
 * Dependency 객체가 유효한지 확인
 *
 * @param dependency - 확인할 dependency
 * @returns 필수 필드가 모두 있으면 true
 */
export function isValidDependency(
    dependency: Partial<Dependency> | undefined | null
): dependency is Dependency {
    return (
        dependency !== undefined &&
        dependency !== null &&
        typeof dependency.id === 'string' &&
        typeof dependency.predecessorId === 'string' &&
        ['FS', 'SS', 'FF', 'SF'].includes(dependency.type as string)
    );
}

/**
 * Task가 Level 1 (Master View)인지 확인
 *
 * @param task - 확인할 task
 * @returns wbsLevel이 1이면 true
 */
export function isLevel1Task(
    task: ConstructionTask | undefined | null
): task is ConstructionTask & { wbsLevel: 1 } {
    return task !== undefined && task !== null && task.wbsLevel === 1;
}

/**
 * Task가 Level 2 (Detail View)인지 확인
 *
 * @param task - 확인할 task
 * @returns wbsLevel이 2이면 true
 */
export function isLevel2Task(
    task: ConstructionTask | undefined | null
): task is ConstructionTask & { wbsLevel: 2 } {
    return task !== undefined && task !== null && task.wbsLevel === 2;
}

/**
 * Task가 최상위 레벨인지 확인 (parentId가 null)
 *
 * @param task - 확인할 task
 * @returns parentId가 null이면 true
 */
export function isRootTask(
    task: ConstructionTask | undefined | null
): task is ConstructionTask & { parentId: null } {
    return task !== undefined && task !== null && task.parentId === null;
}

/**
 * 배열이 비어있지 않은지 확인
 *
 * @param arr - 확인할 배열
 * @returns 배열이 존재하고 요소가 하나 이상 있으면 true
 */
export function isNonEmptyArray<T>(arr: T[] | undefined | null): arr is [T, ...T[]] {
    return Array.isArray(arr) && arr.length > 0;
}
