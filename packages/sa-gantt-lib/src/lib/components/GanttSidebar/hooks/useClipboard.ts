'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ConstructionTask, ViewMode } from '../../../types';
import { generateId } from '../../../utils/uuid';

interface UseClipboardOptions {
    selectedTaskIds: Set<string>;
    allTasks: ConstructionTask[];
    viewMode: ViewMode;
    activeCPId?: string | null;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    enabled?: boolean;  // header 모드에서 비활성화하여 이벤트 리스너 중복 방지
}

export const useClipboard = ({
    selectedTaskIds,
    allTasks,
    viewMode,
    activeCPId,
    onTaskCreate,
    enabled = true,  // 기본값 true (하위 호환성)
}: UseClipboardOptions) => {
    const [clipboardTasks, setClipboardTasks] = useState<ConstructionTask[]>([]);

    // Refs로 최신 값 참조 (렌더링 중 동기적 업데이트)
    const selectedTaskIdsRef = useRef(selectedTaskIds);
    const clipboardTasksRef = useRef(clipboardTasks);
    const allTasksRef = useRef(allTasks);

    // 렌더링 중 동기적으로 Ref 업데이트 (useEffect 타이밍 문제 해결)
    selectedTaskIdsRef.current = selectedTaskIds;
    clipboardTasksRef.current = clipboardTasks;
    allTasksRef.current = allTasks;

    // 복사본 이름 생성 함수
    const generateCopyName = useCallback((originalName: string, existingTasks: ConstructionTask[]): string => {
        const existingNames = new Set(existingTasks.map(t => t.name));
        const match = originalName.match(/^(.+?)\s*(\d+)$/);

        if (match) {
            const baseName = match[1].trim();
            let nextNum = parseInt(match[2], 10) + 1;
            while (existingNames.has(`${baseName} ${nextNum}`)) nextNum++;
            return `${baseName} ${nextNum}`;
        } else {
            let num = 1;
            while (existingNames.has(`${originalName} ${num}`)) num++;
            return `${originalName} ${num}`;
        }
    }, []);

    // 키보드 이벤트 핸들러 (useEffect 내부에서 정의하여 클로저 문제 해결)
    useEffect(() => {
        // enabled가 false면 이벤트 리스너를 등록하지 않음 (중복 방지)
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' ||
                                 target.tagName === 'TEXTAREA' ||
                                 target.isContentEditable;

            if (isInputField) return;
            if (!(e.metaKey || e.ctrlKey)) return;

            const key = e.key.toLowerCase();

            // Cmd/Ctrl + C: 복사
            if (key === 'c' && selectedTaskIdsRef.current.size > 0) {
                e.preventDefault();
                e.stopImmediatePropagation();  // 다른 리스너 실행 방지

                const selectedIds = Array.from(selectedTaskIdsRef.current);
                const tasksToCopy: ConstructionTask[] = [];
                const currentAllTasks = allTasksRef.current;

                const collectTasksRecursively = (taskId: string) => {
                    const task = currentAllTasks.find(t => t.id === taskId);
                    if (!task || tasksToCopy.some(t => t.id === task.id)) return;

                    tasksToCopy.push({ ...task });

                    // 자식 찾기
                    const children = currentAllTasks.filter(t => t.parentId === taskId);

                    // 모든 자식 수집 (타입 조건 없음)
                    children.forEach(child => collectTasksRecursively(child.id));
                };

                selectedIds.forEach(id => collectTasksRecursively(id));
                setClipboardTasks(tasksToCopy);
            }

            // Cmd/Ctrl + V: 붙여넣기
            if (key === 'v' && clipboardTasksRef.current.length > 0 && onTaskCreate) {
                e.preventDefault();
                e.stopImmediatePropagation();  // 다른 리스너 실행 방지

                const currentClipboard = clipboardTasksRef.current;
                const currentAllTasks = allTasksRef.current;

                // 현재 tasks의 최대 sortOrder 계산 (맨 뒤에 붙여넣기)
                let nextSortOrder = currentAllTasks.length;

                const idMap = new Map<string, string>();
                currentClipboard.forEach(task => {
                    idMap.set(task.id, generateId());
                });

                const topLevelParentId = viewMode === 'DETAIL' ? activeCPId : null;
                const copiedIds = new Set(currentClipboard.map(t => t.id));

                // 위상 정렬 (Kahn's Algorithm): 부모가 자식보다 항상 먼저 오도록
                // FK 제약 조건 위반 방지 (parent_id는 먼저 존재해야 함)
                const sortedTasks: ConstructionTask[] = [];
                const taskMap = new Map(currentClipboard.map(t => [t.id, t]));
                const remaining = new Set(currentClipboard.map(t => t.id));

                // 부모가 없거나 부모가 복사 대상에 없는 태스크부터 시작
                while (remaining.size > 0) {
                    let foundAny = false;
                    for (const id of remaining) {
                        const task = taskMap.get(id);
                        if (!task) {
                            remaining.delete(id);
                            continue;
                        }

                        // 부모가 없거나, 부모가 복사 대상에 없거나, 부모가 이미 정렬됨
                        const parentInCopy = task.parentId && copiedIds.has(task.parentId);
                        const parentAlreadySorted = task.parentId && sortedTasks.some(t => t.id === task.parentId);

                        if (!parentInCopy || parentAlreadySorted) {
                            sortedTasks.push(task);
                            remaining.delete(id);
                            foundAny = true;
                        }
                    }
                    // 순환 참조 방지: 진전이 없으면 나머지 모두 추가
                    if (!foundAny) {
                        for (const id of remaining) {
                            const fallbackTask = taskMap.get(id);
                            if (fallbackTask) {
                                sortedTasks.push(fallbackTask);
                            }
                        }
                        break;
                    }
                }

                // 순차 실행: 부모 INSERT 완료 후 자식 INSERT (async IIFE)
                (async () => {
                    for (const task of sortedTasks) {
                        let newParentId: string | null;

                        if (task.parentId && idMap.has(task.parentId)) {
                            newParentId = idMap.get(task.parentId) ?? task.parentId;
                        } else if (copiedIds.has(task.id) && !currentClipboard.some(t => t.id === task.parentId)) {
                            newParentId = topLevelParentId ?? null;
                        } else {
                            newParentId = task.parentId;
                        }

                        const mappedId = idMap.get(task.id);
                        if (!mappedId) {
                            continue;
                        }

                        const isTopLevel = !task.parentId || !copiedIds.has(task.parentId);
                        const newTask: Partial<ConstructionTask> & { sortOrder?: number } = {
                            ...task,
                            id: mappedId,
                            parentId: newParentId,
                            name: isTopLevel ? generateCopyName(task.name, currentAllTasks) : task.name,
                            dependencies: [],
                            sortOrder: nextSortOrder++,  // 순차적으로 sortOrder 할당
                        };

                        // await로 순차 실행 보장 (부모가 DB에 INSERT된 후 자식 INSERT)
                        await onTaskCreate(newTask);
                    }
                })();
            }
        };

        // capture: true로 이벤트 캡처 단계에서 먼저 처리
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [viewMode, activeCPId, onTaskCreate, generateCopyName, enabled]);  // enabled 의존성 추가

    return {
        clipboardTasks,
        handleCopy: () => {}, // 키보드만 사용하므로 빈 함수 (외부 호출용)
        handlePaste: () => {},
    };
};
