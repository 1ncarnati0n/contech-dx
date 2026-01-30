/**
 * Hierarchy Validation Utilities
 *
 * 계층 구조 검증을 위한 유틸리티
 *
 * 유효한 계층 구조:
 * - BLOCK → CP (필수)
 * - CP → TASK, GROUP
 * - GROUP → TASK, GROUP (중첩 가능)
 * - TASK → (자식 불가)
 *
 * 금지된 구조:
 * - BLOCK → TASK (CP 필수)
 * - BLOCK → GROUP (CP 아래에만 허용)
 * - GROUP이 CP 외부에 존재
 */

import type { ConstructionTask, TaskType, DropPosition } from '../types';

// ============================================
// 유효한 부모-자식 관계 정의
// ============================================

/**
 * 각 TaskType이 가질 수 있는 유효한 자식 타입
 */
export const VALID_PARENT_CHILD_RELATIONS: Record<TaskType, TaskType[]> = {
    BLOCK: ['CP'],                    // BLOCK은 CP만 자식으로
    CP: ['TASK', 'GROUP'],            // CP는 TASK, GROUP 자식 가능
    GROUP: ['TASK', 'GROUP'],         // GROUP은 TASK, GROUP 자식 가능 (중첩)
    TASK: [],                         // TASK는 자식 불가
};

/**
 * 각 TaskType이 가질 수 있는 유효한 형제(sibling) 타입
 * before/after 이동 시 사용
 */
export const VALID_SIBLING_RELATIONS: Record<TaskType, TaskType[]> = {
    BLOCK: ['BLOCK'],                 // BLOCK은 BLOCK과 형제 가능
    CP: ['CP'],                       // CP는 CP와 형제 가능
    GROUP: ['TASK', 'GROUP'],         // GROUP은 TASK, GROUP과 형제 가능
    TASK: ['TASK', 'GROUP'],          // TASK는 TASK, GROUP과 형제 가능
};

// ============================================
// 계층 검증 함수
// ============================================

/**
 * 특정 타입이 다른 타입의 자식이 될 수 있는지 확인
 */
export const canBeChildOf = (childType: TaskType, parentType: TaskType): boolean => {
    return VALID_PARENT_CHILD_RELATIONS[parentType].includes(childType);
};

/**
 * 특정 타입이 다른 타입과 형제가 될 수 있는지 확인
 */
export const canBeSiblingOf = (movingType: TaskType, targetType: TaskType): boolean => {
    return VALID_SIBLING_RELATIONS[movingType].includes(targetType);
};

/**
 * 순환 참조 감지 (A를 B의 자식으로 이동 시 B가 A의 자손인지 확인)
 */
export const wouldCreateCycle = (
    movingTaskId: string,
    targetId: string,
    taskMap: Map<string, ConstructionTask>
): boolean => {
    // target이 moving의 자손인지 확인
    let current = taskMap.get(targetId);

    while (current?.parentId) {
        if (current.parentId === movingTaskId) {
            return true; // 순환 발생
        }
        current = taskMap.get(current.parentId);
    }

    return false;
};

/**
 * Task 이동 가능 여부 검사
 *
 * @param movingTask - 이동하려는 Task
 * @param targetTask - 대상 Task (before/after/into의 기준)
 * @param position - 'before' | 'after' | 'into'
 * @param allTasks - 전체 Task 배열
 * @returns { valid: boolean; reason?: string }
 */
export const canMoveTaskTo = (
    movingTask: ConstructionTask,
    targetTask: ConstructionTask | null,
    position: DropPosition,
    allTasks: ConstructionTask[]
): { valid: boolean; reason?: string } => {
    // Task 맵 생성
    const taskMap = new Map<string, ConstructionTask>();
    allTasks.forEach(t => taskMap.set(t.id, t));

    // 자기 자신으로 이동 불가
    if (targetTask && movingTask.id === targetTask.id) {
        return { valid: false, reason: '자기 자신으로 이동할 수 없습니다.' };
    }

    // === 'into' 이동: targetTask가 새 부모가 됨 ===
    if (position === 'into') {
        if (!targetTask) {
            // 최상위로 이동하려는 경우: BLOCK만 가능
            if (movingTask.type !== 'BLOCK') {
                return { valid: false, reason: '최상위 레벨에는 BLOCK만 위치할 수 있습니다.' };
            }
            return { valid: true };
        }

        // 순환 참조 체크
        if (wouldCreateCycle(movingTask.id, targetTask.id, taskMap)) {
            return { valid: false, reason: '순환 참조가 발생합니다. 부모를 자식 안으로 이동할 수 없습니다.' };
        }

        // 유효한 부모-자식 관계 체크
        if (!canBeChildOf(movingTask.type, targetTask.type)) {
            const allowed = VALID_PARENT_CHILD_RELATIONS[targetTask.type].join(', ') || '없음';
            return {
                valid: false,
                reason: `${targetTask.type}의 자식으로 ${movingTask.type}을 추가할 수 없습니다. (허용: ${allowed})`,
            };
        }

        // GROUP은 CP 하위에서만 존재 가능
        if (movingTask.type === 'GROUP') {
            // targetTask가 CP가 아니면 CP 조상이 있는지 확인
            let hasCP = targetTask.type === 'CP';
            let current: ConstructionTask | undefined = targetTask;

            while (current?.parentId && !hasCP) {
                current = taskMap.get(current.parentId);
                if (current?.type === 'CP') {
                    hasCP = true;
                }
            }

            if (!hasCP) {
                return { valid: false, reason: 'GROUP은 CP 하위에서만 존재할 수 있습니다.' };
            }
        }

        return { valid: true };
    }

    // === 'before' / 'after' 이동: targetTask와 형제가 됨 ===
    if (!targetTask) {
        // 최상위의 before/after: BLOCK만 가능
        if (movingTask.type !== 'BLOCK') {
            return { valid: false, reason: '최상위 레벨에는 BLOCK만 위치할 수 있습니다.' };
        }
        return { valid: true };
    }

    // 같은 부모를 갖게 되므로 부모-자식 관계 검증
    const targetParent = targetTask.parentId ? taskMap.get(targetTask.parentId) : null;

    if (targetParent) {
        // 순환 참조 체크 (target의 부모 기준)
        if (wouldCreateCycle(movingTask.id, targetParent.id, taskMap)) {
            return { valid: false, reason: '순환 참조가 발생합니다.' };
        }

        // 유효한 부모-자식 관계 체크
        if (!canBeChildOf(movingTask.type, targetParent.type)) {
            const allowed = VALID_PARENT_CHILD_RELATIONS[targetParent.type].join(', ') || '없음';
            return {
                valid: false,
                reason: `${targetParent.type} 하위로 ${movingTask.type}을 이동할 수 없습니다. (허용: ${allowed})`,
            };
        }

        // GROUP은 CP 하위에서만
        if (movingTask.type === 'GROUP') {
            let hasCP = targetParent.type === 'CP';
            let current: ConstructionTask | undefined = targetParent;

            while (current?.parentId && !hasCP) {
                current = taskMap.get(current.parentId);
                if (current?.type === 'CP') {
                    hasCP = true;
                }
            }

            if (!hasCP) {
                return { valid: false, reason: 'GROUP은 CP 하위에서만 존재할 수 있습니다.' };
            }
        }
    } else {
        // 최상위로 이동: BLOCK만 가능
        if (movingTask.type !== 'BLOCK') {
            return { valid: false, reason: '최상위 레벨에는 BLOCK만 위치할 수 있습니다.' };
        }
    }

    return { valid: true };
};

/**
 * 유효한 드롭 위치 필터링
 *
 * 주어진 movingTask가 targetTask에 대해 어떤 position이 유효한지 반환
 */
export const getValidDropPositions = (
    movingTask: ConstructionTask,
    targetTask: ConstructionTask,
    allTasks: ConstructionTask[]
): DropPosition[] => {
    const positions: DropPosition[] = ['before', 'after', 'into'];

    return positions.filter(position => {
        const result = canMoveTaskTo(movingTask, targetTask, position, allTasks);
        return result.valid;
    });
};
