'use client';

import { useCallback, useState, useEffect } from 'react';
import { addDays, differenceInDays } from 'date-fns';
import { isHoliday, snapToWorkingDay } from '../../../utils/dateUtils';
import type {
    ConstructionTask,
    Milestone,
    ViewMode,
    CalendarSettings,
    GroupDragResult,
    GanttErrorContext,
} from '../../../types';
import type { BarDragResult } from '../../GanttTimeline';

// ============================================
// useGanttHandlers Hook
// ============================================
// 드래그, 모달, 태스크 핸들러를 캡슐화

interface UseGanttHandlersOptions {
    tasks: ConstructionTask[];
    milestones: Milestone[];
    viewMode: ViewMode;
    activeCPId: string | null;
    holidays: Date[];
    calendarSettings: CalendarSettings;
    // Callbacks from props
    onTaskUpdate?: (task: ConstructionTask) => void;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void;
    onTaskDelete?: (taskId: string) => void;
    onMilestoneCreate?: (milestone: Milestone) => void;
    onMilestoneUpdate?: (milestone: Milestone) => void;
    onMilestoneDelete?: (milestoneId: string) => void;
    onGroupDrag?: (result: GroupDragResult) => void;
    onViewChange?: (mode: ViewMode, cpId?: string) => void;
    onError?: (error: Error, context: GanttErrorContext) => void;
    setViewMode: (mode: ViewMode, cpId?: string) => void;
}

interface UseGanttHandlersReturn {
    // Modal States
    editingMilestone: Milestone | null;
    isEditModalOpen: boolean;
    isNewMilestone: boolean;
    editingTask: ConstructionTask | null;
    isTaskEditModalOpen: boolean;

    // View Handlers
    handleViewChange: (mode: ViewMode, cpId?: string) => void;
    handleTaskClick: (task: ConstructionTask) => void;

    // Milestone Handlers
    handleMilestoneDoubleClick: (milestone: Milestone) => void;
    handleStartAddMilestone: () => void;
    handleContextMenuAddMilestone: (date: Date) => void;
    handleCloseEditModal: () => void;
    handleMilestoneSave: (milestone: Milestone) => void;
    handleMilestoneDelete: (milestoneId: string) => void;

    // Task Handlers
    handleTaskDoubleClick: (task: ConstructionTask) => void;
    handleContextMenuAddTask: (date: Date) => void;
    handleCloseTaskEditModal: () => void;
    handleTaskEditSave: (task: ConstructionTask) => void;
    handleTaskEditDelete: (taskId: string) => void;

    // Drag Handlers
    handleBarDrag: (result: BarDragResult) => Promise<void>;
    handleGroupDrag: (result: GroupDragResult) => Promise<void>;
}

export const useGanttHandlers = ({
    tasks,
    milestones,
    viewMode,
    activeCPId,
    holidays,
    calendarSettings,
    onTaskUpdate,
    onTaskCreate,
    onTaskDelete,
    onMilestoneCreate,
    onMilestoneUpdate,
    onMilestoneDelete,
    onGroupDrag,
    onViewChange,
    onError,
    setViewMode,
}: UseGanttHandlersOptions): UseGanttHandlersReturn => {
    // ========================================
    // Modal States
    // ========================================
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isNewMilestone, setIsNewMilestone] = useState(false);
    const [editingTask, setEditingTask] = useState<ConstructionTask | null>(null);
    const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);

    // ========================================
    // View Handlers
    // ========================================
    const handleViewChange = useCallback((mode: ViewMode, cpId?: string) => {
        setViewMode(mode, cpId);
        onViewChange?.(mode, cpId);
    }, [setViewMode, onViewChange]);

    const handleTaskClick = useCallback((task: ConstructionTask) => {
        if (viewMode === 'MASTER' && task.type === 'CP') {
            handleViewChange('DETAIL', task.id);
        }
    }, [viewMode, handleViewChange]);

    // ========================================
    // Milestone Handlers
    // ========================================
    const handleMilestoneDoubleClick = useCallback((milestone: Milestone) => {
        setEditingMilestone(milestone);
        setIsNewMilestone(false);
        setIsEditModalOpen(true);
    }, []);

    const handleStartAddMilestone = useCallback(() => {
        const newMilestone: Milestone = {
            id: `milestone-${Date.now()}`,
            name: '',
            date: new Date(),
            description: '',
        };
        setEditingMilestone(newMilestone);
        setIsNewMilestone(true);
        setIsEditModalOpen(true);
    }, []);

    const handleContextMenuAddMilestone = useCallback((date: Date) => {
        const newMilestone: Milestone = {
            id: `milestone-${Date.now()}`,
            name: '',
            date: date,
            description: '',
            milestoneType: viewMode === 'MASTER' ? 'MASTER' : 'DETAIL',
        };
        setEditingMilestone(newMilestone);
        setIsNewMilestone(true);
        setIsEditModalOpen(true);
    }, [viewMode]);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setEditingMilestone(null);
        setIsNewMilestone(false);
    }, []);

    const handleMilestoneSave = useCallback((updatedMilestone: Milestone) => {
        if (isNewMilestone && onMilestoneCreate) {
            onMilestoneCreate(updatedMilestone);
            setIsNewMilestone(false);
        } else if (onMilestoneUpdate) {
            onMilestoneUpdate(updatedMilestone);
        }
    }, [isNewMilestone, onMilestoneCreate, onMilestoneUpdate]);

    const handleMilestoneDelete = useCallback((milestoneId: string) => {
        if (onMilestoneDelete) {
            onMilestoneDelete(milestoneId);
        }
        handleCloseEditModal();
    }, [onMilestoneDelete, handleCloseEditModal]);

    // ========================================
    // Task Handlers
    // ========================================
    const handleTaskDoubleClick = useCallback((task: ConstructionTask) => {
        setEditingTask(task);
        setIsTaskEditModalOpen(true);
    }, []);

    const handleContextMenuAddTask = useCallback((date: Date) => {
        if (!activeCPId || !onTaskCreate) return;

        const newTask: Partial<ConstructionTask> = {
            id: `task-${Date.now()}`,
            parentId: activeCPId,
            wbsLevel: 2,
            type: 'TASK',
            name: '새 공정',
            startDate: date,
            endDate: date,
            task: {
                netWorkDays: 1,
                indirectWorkDaysPre: 0,
                indirectWorkDaysPost: 0,
            },
            dependencies: [],
        };
        onTaskCreate(newTask);
    }, [activeCPId, onTaskCreate]);

    const handleCloseTaskEditModal = useCallback(() => {
        setIsTaskEditModalOpen(false);
        setEditingTask(null);
    }, []);

    const handleTaskEditSave = useCallback((updatedTask: ConstructionTask) => {
        if (onTaskUpdate) {
            onTaskUpdate(updatedTask);
        }
    }, [onTaskUpdate]);

    const handleTaskEditDelete = useCallback((taskId: string) => {
        if (onTaskDelete) {
            onTaskDelete(taskId);
        }
        handleCloseTaskEditModal();
    }, [onTaskDelete, handleCloseTaskEditModal]);

    // ========================================
    // Sync editingTask/editingMilestone with data
    // ========================================
    useEffect(() => {
        if (editingTask && isTaskEditModalOpen) {
            const updatedTask = tasks.find(t => t.id === editingTask.id);
            if (updatedTask) {
                setEditingTask(updatedTask);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks]);

    useEffect(() => {
        if (editingMilestone && isEditModalOpen) {
            const updatedMilestone = milestones.find(m => m.id === editingMilestone.id);
            if (updatedMilestone) {
                setEditingMilestone(updatedMilestone);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [milestones]);

    // ========================================
    // Drag Handlers
    // ========================================
    const handleBarDrag = useCallback(async (result: BarDragResult) => {
        if (!onTaskUpdate) return;

        try {
            const task = tasks.find(t => t.id === result.taskId);
            if (!task || !task.task) return;

            const updatedTask: ConstructionTask = {
                ...task,
                startDate: result.newStartDate,
                endDate: result.newEndDate,
                task: {
                    ...task.task,
                    indirectWorkDaysPre: result.newIndirectWorkDaysPre,
                    indirectWorkDaysPost: result.newIndirectWorkDaysPost,
                    netWorkDays: result.newNetWorkDays,
                },
            };

            await onTaskUpdate(updatedTask);
        } catch (error) {
            console.error('Failed to update task:', error);
            onError?.(error as Error, { action: 'bar_drag', taskId: result.taskId });
        }
    }, [tasks, onTaskUpdate, onError]);

    const handleGroupDrag = useCallback(async (result: GroupDragResult) => {
        if (!onTaskUpdate && !onGroupDrag) return;

        try {
            if (onGroupDrag) {
                await onGroupDrag(result);
                return;
            }

            if (onTaskUpdate) {
                if (result.taskUpdates && result.taskUpdates.length > 0) {
                    for (const update of result.taskUpdates) {
                        const task = tasks.find(t => t.id === update.taskId);
                        if (!task) continue;

                        const duration = differenceInDays(task.endDate, task.startDate);
                        const newEndDate = addDays(update.newStartDate, duration);

                        const updatedTask: ConstructionTask = {
                            ...task,
                            startDate: update.newStartDate,
                            endDate: newEndDate,
                        };

                        await onTaskUpdate(updatedTask);
                    }
                } else {
                    // fallback: taskUpdates가 없으면 기존 방식
                    const dragDirection: 'left' | 'right' = result.deltaDays >= 0 ? 'right' : 'left';

                    for (const taskId of result.affectedTaskIds) {
                        const task = tasks.find(t => t.id === taskId);
                        if (!task) continue;

                        let newStartDate = addDays(task.startDate, result.deltaDays);

                        if (isHoliday(newStartDate, holidays, calendarSettings)) {
                            newStartDate = snapToWorkingDay(newStartDate, dragDirection, holidays, calendarSettings);
                        }

                        const duration = differenceInDays(task.endDate, task.startDate);
                        const newEndDate = addDays(newStartDate, duration);

                        const updatedTask: ConstructionTask = {
                            ...task,
                            startDate: newStartDate,
                            endDate: newEndDate,
                        };

                        await onTaskUpdate(updatedTask);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to update group tasks:', error);
            onError?.(error as Error, {
                action: 'bar_drag',
                taskId: result.groupId,
                details: { affectedTaskIds: result.affectedTaskIds },
            });
        }
    }, [tasks, onTaskUpdate, onGroupDrag, onError, holidays, calendarSettings]);

    return {
        // Modal States
        editingMilestone,
        isEditModalOpen,
        isNewMilestone,
        editingTask,
        isTaskEditModalOpen,

        // View Handlers
        handleViewChange,
        handleTaskClick,

        // Milestone Handlers
        handleMilestoneDoubleClick,
        handleStartAddMilestone,
        handleContextMenuAddMilestone,
        handleCloseEditModal,
        handleMilestoneSave,
        handleMilestoneDelete,

        // Task Handlers
        handleTaskDoubleClick,
        handleContextMenuAddTask,
        handleCloseTaskEditModal,
        handleTaskEditSave,
        handleTaskEditDelete,

        // Drag Handlers
        handleBarDrag,
        handleGroupDrag,
    };
};
