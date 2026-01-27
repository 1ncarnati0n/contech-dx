'use client';

import { useState, useCallback, useRef } from 'react';
import type { ConstructionTask } from '../../../types';

interface UseInlineEditOptions {
    tasks: ConstructionTask[];
    onTaskUpdate?: (task: ConstructionTask) => void;
}

export const useInlineEdit = ({ tasks, onTaskUpdate }: UseInlineEditOptions) => {
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string>('');
    const editInputRef = useRef<HTMLInputElement>(null);

    const handleStartEdit = useCallback((task: ConstructionTask) => {
        setEditingTaskId(task.id);
        setEditingName(task.name);
        setTimeout(() => {
            editInputRef.current?.focus();
            editInputRef.current?.select();
        }, 0);
    }, []);

    const handleStartRename = useCallback((taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && onTaskUpdate) {
            handleStartEdit(task);
        }
    }, [tasks, onTaskUpdate, handleStartEdit]);

    const handleSaveEdit = useCallback(() => {
        if (!editingTaskId || !onTaskUpdate) {
            setEditingTaskId(null);
            return;
        }

        const task = tasks.find(t => t.id === editingTaskId);
        if (task && editingName.trim() && editingName !== task.name) {
            onTaskUpdate({
                ...task,
                name: editingName.trim(),
            });
        }

        setEditingTaskId(null);
        setEditingName('');
    }, [editingTaskId, editingName, tasks, onTaskUpdate]);

    const handleCancelEdit = useCallback(() => {
        setEditingTaskId(null);
        setEditingName('');
    }, []);

    const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit();
        }
    }, [handleSaveEdit, handleCancelEdit]);

    return {
        editingTaskId,
        editingName,
        setEditingName,
        editInputRef,
        handleStartEdit,
        handleStartRename,
        handleSaveEdit,
        handleCancelEdit,
        handleEditKeyDown,
    };
};
