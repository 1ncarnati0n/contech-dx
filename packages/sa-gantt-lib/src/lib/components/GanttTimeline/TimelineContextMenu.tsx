'use client';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ViewMode } from '../../types';

interface TimelineContextMenuProps {
    x: number;
    y: number;
    clickedDate: Date;
    viewMode: ViewMode;
    onAddTask?: (date: Date) => void;
    onAddMilestone: (date: Date) => void;
    onClose: () => void;
    // 선택된 종속성 관련
    selectedDependencyId?: string | null;
    onDeleteDependency?: (depId: string) => void;
}

export const TimelineContextMenu: React.FC<TimelineContextMenuProps> = ({
    x,
    y,
    clickedDate,
    viewMode,
    onAddTask,
    onAddMilestone,
    onClose,
    selectedDependencyId,
    onDeleteDependency,
}) => {
    const isDetailView = viewMode === 'DETAIL';
    const hasDependencySelected = !!selectedDependencyId && !!onDeleteDependency;

    // 메뉴 위치 조정 (화면 밖으로 나가지 않도록)
    const menuWidth = 200;
    // 종속성 선택 시 삭제 버튼 높이 추가 (약 44px)
    const baseHeight = isDetailView ? 140 : 100;
    const menuHeight = hasDependencySelected ? baseHeight + 44 : baseHeight;
    const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
    const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

    // ESC 키로 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = () => {
            onClose();
        };
        // 다음 틱에 리스너 등록 (현재 클릭 이벤트 무시)
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [onClose]);

    return ReactDOM.createPortal(
        <div
            className="fixed z-100 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            style={{ left: adjustedX, top: adjustedY }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* 날짜 표시 헤더 */}
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                {format(clickedDate, 'yyyy-MM-dd (EEE)', { locale: ko })}
            </div>

            {/* 종속성 삭제 (선택된 종속성이 있을 때만) */}
            {hasDependencySelected && (
                <>
                    <button
                        onClick={() => {
                            onDeleteDependency!(selectedDependencyId!);
                            onClose();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        종속성 삭제
                    </button>
                    <div className="my-1 border-t border-gray-200" />
                </>
            )}

            {/* Task 추가 (Detail View에서만) */}
            {isDetailView && onAddTask && (
                <button
                    onClick={() => {
                        onAddTask(clickedDate);
                        onClose();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Task 추가
                </button>
            )}

            {/* 마일스톤 추가 */}
            <button
                onClick={() => {
                    onAddMilestone(clickedDate);
                    onClose();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
                <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                마일스톤 추가
            </button>

            {/* 구분선 + 취소 */}
            <div className="my-1 border-t border-gray-200" />
            <button
                onClick={onClose}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                취소
            </button>
        </div>,
        document.body
    );
};
