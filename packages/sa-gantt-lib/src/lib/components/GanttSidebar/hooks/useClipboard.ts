'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ConstructionTask, ViewMode } from '../../../types';

interface UseClipboardOptions {
    selectedTaskIds: Set<string>;
    allTasks: ConstructionTask[];
    viewMode: ViewMode;
    activeCPId?: string | null;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
}

export const useClipboard = ({
    selectedTaskIds,
    allTasks,
    viewMode,
    activeCPId,
    onTaskCreate,
}: UseClipboardOptions) => {
    const [clipboardTasks, setClipboardTasks] = useState<ConstructionTask[]>([]);

    // 복사본 이름 생성 함수
    const generateCopyName = useCallback((originalName: string, existingTasks: ConstructionTask[]): string => {
        const existingNames = new Set(existingTasks.map(t => t.name));
        const match = originalName.match(/^(.+?)\s*(\d+)$/);

        if (match) {
            const baseName = match[1].trim();
            let nextNum = parseInt(match[2], 10) + 1;

            while (existingNames.has(`${baseName} ${nextNum}`)) {
                nextNum++;
            }
            return `${baseName} ${nextNum}`;
        } else {
            let num = 1;
            while (existingNames.has(`${originalName} ${num}`)) {
                num++;
            }
            return `${originalName} ${num}`;
        }
    }, []);

    // 복사 핸들러
    const handleCopy = useCallback(() => {
        if (selectedTaskIds.size === 0) return;

        const selectedIds = Array.from(selectedTaskIds);
        const tasksToCopy: ConstructionTask[] = [];

        const collectTasksRecursively = (taskId: string) => {
            const task = allTasks.find(t => t.id === taskId);
            if (task && !tasksToCopy.some(t => t.id === task.id)) {
                tasksToCopy.push({ ...task });
                if (task.type === 'GROUP' || task.type === 'CP') {
                    allTasks.filter(t => t.parentId === taskId)
                        .forEach(child => collectTasksRecursively(child.id));
                }
            }
        };

        selectedIds.forEach(id => collectTasksRecursively(id));
        setClipboardTasks(tasksToCopy);
    }, [selectedTaskIds, allTasks]);

    // 붙여넣기 핸들러
    const handlePaste = useCallback(() => {
        if (clipboardTasks.length === 0 || !onTaskCreate) return;

        const timestamp = Date.now();
        const idMap = new Map<string, string>();

        clipboardTasks.forEach((task, index) => {
            const newId = `${task.type.toLowerCase()}-${timestamp + index}`;
            idMap.set(task.id, newId);
        });

        const topLevelParentId = viewMode === 'DETAIL' ? activeCPId : null;
        const copiedIds = new Set(clipboardTasks.map(t => t.id));

        clipboardTasks.forEach(task => {
            let newParentId: string | null;

            if (task.parentId && idMap.has(task.parentId)) {
                newParentId = idMap.get(task.parentId)!;
            } else if (copiedIds.has(task.id) && !clipboardTasks.some(t => t.id === task.parentId)) {
                newParentId = topLevelParentId ?? null;
            } else {
                newParentId = task.parentId;
            }

            const isTopLevel = !task.parentId || !copiedIds.has(task.parentId);
            const newTask: Partial<ConstructionTask> = {
                ...task,
                id: idMap.get(task.id),
                parentId: newParentId,
                name: isTopLevel ? generateCopyName(task.name, allTasks) : task.name,
                dependencies: [],
            };

            onTaskCreate(newTask);
        });
    }, [clipboardTasks, onTaskCreate, viewMode, activeCPId, generateCopyName, allTasks]);

    // 키보드 단축키
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            // Cmd/Ctrl + C: 복사
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c' && !isInputField) {
                if (selectedTaskIds.size > 0) {
                    e.preventDefault();
                    handleCopy();
                }
            }

            // Cmd/Ctrl + V: 붙여넣기
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v' && !isInputField) {
                if (clipboardTasks.length > 0) {
                    e.preventDefault();
                    handlePaste();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleCopy, handlePaste, selectedTaskIds, clipboardTasks]);

    return {
        clipboardTasks,
        handleCopy,
        handlePaste,
    };
};
