'use client';

import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ConstructionTask } from '../types';
import { isCPTask, isGroupTask, isRegularTask, isBlockTask } from '../utils/typeGuards';

interface GanttSidebarContextMenuProps {
    x: number;
    y: number;
    taskId: string;
    selectedTaskIds: Set<string>;
    tasks: ConstructionTask[];
    onTaskGroup?: (taskIds: string[]) => void;
    onTaskUngroup?: (groupId: string) => void;
    /** CP들을 새 BLOCK으로 묶기 (CP 전용) */
    onTaskBlockify?: (taskIds: string[]) => void;
    onTaskDelete?: (taskId: string) => void;
    onStartRename?: (taskId: string) => void;
    onClose: () => void;
    onDeselect: () => void;
}

/** 삭제 확인 모달 컴포넌트 (React Portal 사용) */
const DeleteConfirmModal: React.FC<{
    taskNames: string[];
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ taskNames, onConfirm, onCancel }) => {
    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[60] bg-black/50 transition-opacity"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div
                    className="w-[400px] rounded-xl bg-white shadow-2xl border border-gray-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">삭제 확인</h3>
                                <p className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다</p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4">
                        <div className="rounded-lg bg-red-50 p-4">
                            <p className="text-sm text-gray-600 mb-3">
                                다음 <span className="font-semibold text-red-600">{taskNames.length}개</span> 항목을 삭제하시겠습니까?
                            </p>
                            <ul className="max-h-[150px] overflow-auto space-y-1.5">
                                {taskNames.map((name, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                        <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                                        {name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                        <button
                            onClick={onCancel}
                            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={onConfirm}
                            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
                        >
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

/**
 * 사이드바 컨텍스트 메뉴 컴포넌트
 * 
 * 우클릭 시 표시되는 메뉴로, 태스크 그룹화/해제/삭제 기능을 제공합니다.
 */
export const GanttSidebarContextMenu: React.FC<GanttSidebarContextMenuProps> = ({
    x,
    y,
    taskId,
    selectedTaskIds,
    tasks,
    onTaskGroup,
    onTaskUngroup,
    onTaskBlockify,
    onTaskDelete,
    onStartRename,
    onClose,
    onDeselect,
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 선택된 태스크들의 타입 분석
    const { hasCPSelected, hasTaskSelected, hasGroupSelected, isMixed } = useMemo(() => {
        const selectedList = Array.from(selectedTaskIds);

        const hasCP = selectedList.some(id => {
            const task = tasks.find(t => t.id === id);
            return isCPTask(task);
        });
        const hasTask = selectedList.some(id => {
            const task = tasks.find(t => t.id === id);
            return isRegularTask(task);  // TASK만 (GROUP 제외)
        });
        const hasGroup = selectedList.some(id => {
            const task = tasks.find(t => t.id === id);
            return isGroupTask(task);
        });
        const hasBlock = selectedList.some(id => {
            const task = tasks.find(t => t.id === id);
            return isBlockTask(task);
        });

        // 혼합 선택: TASK/GROUP은 같은 그룹으로 취급 (함께 그룹화 가능)
        const hasTaskOrGroup = hasTask || hasGroup;
        const typeCount = [hasCP, hasTaskOrGroup, hasBlock].filter(Boolean).length;

        return {
            hasCPSelected: hasCP,
            hasTaskSelected: hasTask,
            hasGroupSelected: hasGroup,
            isMixed: typeCount > 1,
        };
    }, [selectedTaskIds, tasks]);

    const handleGroup = () => {
        // TASK 또는 GROUP만 선택된 경우 그룹화 가능 (CP, BLOCK 제외)
        if (selectedTaskIds.size >= 1 && (hasTaskSelected || hasGroupSelected) && !isMixed && onTaskGroup) {
            onTaskGroup(Array.from(selectedTaskIds));
            onClose();
        }
    };

    const handleBlockify = () => {
        // CP만 선택된 경우에만 블럭화 가능 (TASK, GROUP, BLOCK 제외)
        if (selectedTaskIds.size >= 1 && hasCPSelected && !isMixed && onTaskBlockify) {
            onTaskBlockify(Array.from(selectedTaskIds));
            onClose();
        }
    };

    const handleUngroup = () => {
        if (selectedTaskIds.size === 1 && onTaskUngroup) {
            const selectedId = Array.from(selectedTaskIds)[0];
            const task = tasks.find(t => t.id === selectedId);
            if (task?.type === 'GROUP') {
                onTaskUngroup(selectedId);
                onClose();
            }
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = () => {
        if (onTaskDelete) {
            // 선택된 모든 태스크 삭제
            const idsToDelete = selectedTaskIds.size > 0 
                ? Array.from(selectedTaskIds) 
                : [taskId];
            
            idsToDelete.forEach(id => {
                onTaskDelete(id);
            });
        }
        setShowDeleteConfirm(false);
        onDeselect();
        onClose();
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
    };

    // GROUP 1개만 선택되었는지 (그룹 해제용)
    const isGroupSelected = selectedTaskIds.size === 1 && hasGroupSelected;

    // 삭제할 태스크 이름들
    const taskNamesToDelete = selectedTaskIds.size > 0
        ? Array.from(selectedTaskIds).map(id => tasks.find(t => t.id === id)?.name || id)
        : [tasks.find(t => t.id === taskId)?.name || taskId];

    return ReactDOM.createPortal(
        <div
            className="fixed z-[9999] min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* 그룹화 (TASK 또는 GROUP만 선택된 경우) */}
            {selectedTaskIds.size >= 1 && (hasTaskSelected || hasGroupSelected) && !isMixed && onTaskGroup && (
                <button
                    onClick={handleGroup}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    그룹화 ({selectedTaskIds.size}개 선택됨)
                </button>
            )}

            {/* 블럭화 (CP만 선택된 경우) */}
            {selectedTaskIds.size >= 1 && hasCPSelected && !isMixed && onTaskBlockify && (
                <button
                    onClick={handleBlockify}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    블럭화 ({selectedTaskIds.size}개 CP 선택됨)
                </button>
            )}
            
            {/* 그룹 해제 (GROUP 1개 선택 시) */}
            {isGroupSelected && onTaskUngroup && (
                <button
                    onClick={handleUngroup}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                    그룹 해제
                </button>
            )}
            
            {/* 이름 변경 (1개 선택 시) */}
            {selectedTaskIds.size === 1 && onStartRename && (
                <button
                    onClick={() => {
                        const selectedId = Array.from(selectedTaskIds)[0];
                        onStartRename(selectedId);
                        onClose();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    이름 변경
                </button>
            )}
            
            {/* 삭제 */}
            {onTaskDelete && (
                <>
                    <div className="my-1 border-t border-gray-200" />
                    <button
                        onClick={handleDeleteClick}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        삭제 {selectedTaskIds.size > 1 ? `(${selectedTaskIds.size}개)` : ''}
                    </button>
                </>
            )}
            
            {/* 선택 해제 */}
            <div className="my-1 border-t border-gray-200" />
            <button
                onClick={() => {
                    onDeselect();
                    onClose();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                선택 해제
            </button>
            
            {/* 삭제 확인 모달 */}
            {showDeleteConfirm && (
                <DeleteConfirmModal
                    taskNames={taskNamesToDelete}
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleDeleteCancel}
                />
            )}
        </div>,
        document.body
    );
};
