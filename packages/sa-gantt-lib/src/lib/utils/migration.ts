/**
 * Migration Utilities
 *
 * Legacy 데이터 마이그레이션을 위한 유틸리티
 * - GROUP → BLOCK 타입 변환 (최상위 계층 GROUP을 BLOCK으로 마이그레이션)
 */

import type { ConstructionTask } from '../types';

/**
 * 마이그레이션 필요 여부 확인
 *
 * BLOCK 타입이 없고 GROUP이 있으면 마이그레이션 필요
 * 이미 BLOCK 타입이 존재하면 마이그레이션 완료된 것으로 판단
 *
 * @param tasks - 확인할 Task 배열
 * @returns 마이그레이션이 필요하면 true
 */
export const needsMigration = (tasks: ConstructionTask[]): boolean => {
    const hasBlock = tasks.some(t => t.type === 'BLOCK');
    const hasGroup = tasks.some(t => t.type === 'GROUP');

    // BLOCK이 없고 GROUP이 있으면 마이그레이션 필요
    return !hasBlock && hasGroup;
};

/**
 * Task 타입 마이그레이션
 *
 * Legacy 데이터에서 최상위 GROUP을 BLOCK으로 변환:
 * - parentId가 null인 GROUP → BLOCK
 * - parentId가 존재하지만 부모가 CP가 아닌 GROUP → BLOCK
 * - 부모가 CP인 GROUP → GROUP 유지
 *
 * @param tasks - 마이그레이션할 Task 배열
 * @returns 마이그레이션된 Task 배열
 */
export const migrateTaskTypes = (tasks: ConstructionTask[]): ConstructionTask[] => {
    // 마이그레이션이 필요하지 않으면 원본 반환
    if (!needsMigration(tasks)) {
        return tasks;
    }

    // Task ID → Task 맵 생성 (부모 참조용)
    const taskMap = new Map<string, ConstructionTask>();
    tasks.forEach(t => taskMap.set(t.id, t));

    // GROUP → BLOCK 변환 로직
    return tasks.map(task => {
        // GROUP 타입만 검사
        if (task.type !== 'GROUP') {
            return task;
        }

        // parentId가 null이면 최상위 → BLOCK
        if (task.parentId === null) {
            console.log(`[Migration] GROUP → BLOCK: ${task.name} (parentId: null)`);
            return { ...task, type: 'BLOCK' as const };
        }

        // 부모 찾기
        const parent = taskMap.get(task.parentId);

        // 부모가 CP가 아니면 BLOCK으로 변환
        // (부모가 존재하지 않거나 부모도 GROUP인 경우)
        if (!parent || parent.type !== 'CP') {
            console.log(`[Migration] GROUP → BLOCK: ${task.name} (parent type: ${parent?.type ?? 'not found'})`);
            return { ...task, type: 'BLOCK' as const };
        }

        // 부모가 CP인 경우 GROUP 유지
        return task;
    });
};

/**
 * 계층 구조 검증 (마이그레이션 후 검증용)
 *
 * 올바른 계층 구조:
 * - BLOCK → CP만 자식으로 가능
 * - CP → TASK, GROUP 자식 가능
 * - GROUP → TASK, GROUP 자식 가능
 * - TASK → 자식 없음
 *
 * @param tasks - 검증할 Task 배열
 * @returns 검증 결과
 */
export const validateHierarchy = (tasks: ConstructionTask[]): {
    valid: boolean;
    errors: string[];
} => {
    const taskMap = new Map<string, ConstructionTask>();
    tasks.forEach(t => taskMap.set(t.id, t));

    const errors: string[] = [];

    // 자식 → 부모 관계 검증
    tasks.forEach(task => {
        if (task.parentId === null) {
            // 최상위는 BLOCK만 허용
            if (task.type !== 'BLOCK') {
                errors.push(`[${task.name}] 최상위 Task는 BLOCK 타입이어야 합니다 (현재: ${task.type})`);
            }
            return;
        }

        const parent = taskMap.get(task.parentId);
        if (!parent) {
            errors.push(`[${task.name}] 부모 Task를 찾을 수 없습니다 (parentId: ${task.parentId})`);
            return;
        }

        // 부모-자식 관계 검증
        switch (parent.type) {
            case 'BLOCK':
                if (task.type !== 'CP') {
                    errors.push(`[${task.name}] BLOCK의 자식은 CP만 가능합니다 (현재: ${task.type})`);
                }
                break;
            case 'CP':
                if (task.type !== 'TASK' && task.type !== 'GROUP') {
                    errors.push(`[${task.name}] CP의 자식은 TASK 또는 GROUP만 가능합니다 (현재: ${task.type})`);
                }
                break;
            case 'GROUP':
                if (task.type !== 'TASK' && task.type !== 'GROUP') {
                    errors.push(`[${task.name}] GROUP의 자식은 TASK 또는 GROUP만 가능합니다 (현재: ${task.type})`);
                }
                break;
            case 'TASK':
                errors.push(`[${task.name}] TASK는 자식을 가질 수 없습니다`);
                break;
        }
    });

    return {
        valid: errors.length === 0,
        errors,
    };
};
