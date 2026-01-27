/**
 * 상태 비교 유틸리티 함수들
 * JSON.stringify 대신 효율적인 비교를 위해 사용
 */

import type { ConstructionTask, Milestone } from '../types';

/**
 * 두 Date 객체가 같은지 비교
 */
function datesEqual(a: Date | undefined | null, b: Date | undefined | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
}

/**
 * 두 ConstructionTask 배열이 얕은 수준에서 같은지 비교
 * 주요 필드만 비교하여 O(n) 복잡도로 빠르게 동등성 판단
 *
 * @param a 첫 번째 배열
 * @param b 두 번째 배열
 * @returns 얕은 비교에서 같으면 true
 */
export function shallowEqualTasks(
    a: ConstructionTask[] | undefined | null,
    b: ConstructionTask[] | undefined | null
): boolean {
    // 참조가 같으면 동일
    if (a === b) return true;

    // 하나만 null/undefined면 다름
    if (!a || !b) return false;

    // 길이가 다르면 다름
    if (a.length !== b.length) return false;

    // 각 task의 주요 필드 비교
    for (let i = 0; i < a.length; i++) {
        const taskA = a[i];
        const taskB = b[i];

        // 기본 필드 비교
        if (taskA.id !== taskB.id) return false;
        if (taskA.name !== taskB.name) return false;
        if (taskA.parentId !== taskB.parentId) return false;
        if (taskA.type !== taskB.type) return false;
        if (taskA.wbsLevel !== taskB.wbsLevel) return false;

        // 날짜 비교
        if (!datesEqual(taskA.startDate, taskB.startDate)) return false;
        if (!datesEqual(taskA.endDate, taskB.endDate)) return false;

        // CP 데이터 비교 (Level 1)
        if (taskA.cp !== taskB.cp) {
            if (!taskA.cp || !taskB.cp) return false;
            if (taskA.cp.workDaysTotal !== taskB.cp.workDaysTotal) return false;
            if (taskA.cp.nonWorkDaysTotal !== taskB.cp.nonWorkDaysTotal) return false;
        }

        // Task 데이터 비교 (Level 2)
        if (taskA.task !== taskB.task) {
            if (!taskA.task || !taskB.task) return false;
            if (taskA.task.netWorkDays !== taskB.task.netWorkDays) return false;
            if (taskA.task.indirectWorkDaysPre !== taskB.task.indirectWorkDaysPre) return false;
            if (taskA.task.indirectWorkDaysPost !== taskB.task.indirectWorkDaysPost) return false;
            if (taskA.task.indirectWorkNamePre !== taskB.task.indirectWorkNamePre) return false;
            if (taskA.task.indirectWorkNamePost !== taskB.task.indirectWorkNamePost) return false;
        }

        // dependencies 배열 길이만 비교 (깊은 비교는 비용이 높음)
        if (taskA.dependencies?.length !== taskB.dependencies?.length) return false;
    }

    return true;
}

/**
 * 두 Milestone 배열이 얕은 수준에서 같은지 비교
 */
export function shallowEqualMilestones(
    a: Milestone[] | undefined | null,
    b: Milestone[] | undefined | null
): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        const msA = a[i];
        const msB = b[i];

        if (msA.id !== msB.id) return false;
        if (msA.name !== msB.name) return false;
        if (!datesEqual(msA.date, msB.date)) return false;
        if (msA.description !== msB.description) return false;
        if (msA.milestoneType !== msB.milestoneType) return false;
    }

    return true;
}

/**
 * 제네릭 얕은 동등성 비교
 * 객체의 최상위 키만 비교 (중첩 객체는 참조 비교)
 */
export function shallowEqual<T extends Record<string, unknown>>(
    a: T | undefined | null,
    b: T | undefined | null
): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (a[key] !== b[key]) return false;
    }

    return true;
}

/**
 * useHistory에서 사용할 상태 비교 함수
 * tasks와 milestones가 포함된 상태 객체를 효율적으로 비교
 */
export function shallowEqualHistoryState<T extends { tasks?: ConstructionTask[]; milestones?: Milestone[] }>(
    a: T,
    b: T
): boolean {
    if (a === b) return true;

    // tasks 비교
    if ('tasks' in a || 'tasks' in b) {
        if (!shallowEqualTasks(a.tasks, b.tasks)) return false;
    }

    // milestones 비교
    if ('milestones' in a || 'milestones' in b) {
        if (!shallowEqualMilestones(a.milestones, b.milestones)) return false;
    }

    // 나머지 키들은 참조 비교
    const keysA = Object.keys(a).filter(k => k !== 'tasks' && k !== 'milestones');
    const keysB = Object.keys(b).filter(k => k !== 'tasks' && k !== 'milestones');

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
            return false;
        }
    }

    return true;
}
