'use client';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '../../utils/cn';

/**
 * 삭제 확인 모달 Props
 */
export interface DeleteConfirmModalProps {
    /** 삭제할 항목 이름 (표시용) */
    itemName: string;
    /** 모달 제목 (기본: "삭제 확인") */
    title?: string;
    /** 설명 문구 */
    description?: string;
    /** 확인 버튼 클릭 */
    onConfirm: () => void;
    /** 취소 버튼 클릭 */
    onCancel: () => void;
}

/**
 * 삭제 확인 모달 컴포넌트 (React Portal 사용)
 * 
 * 삭제 작업 전 사용자 확인을 받는 공용 모달입니다.
 * 
 * @example
 * ```tsx
 * {showDeleteConfirm && (
 *   <DeleteConfirmModal
 *     itemName="지하골조공사"
 *     title="공정 삭제"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDeleteConfirm(false)}
 *   />
 * )}
 * ```
 */
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    itemName,
    title = '삭제 확인',
    description = '이 작업은 되돌릴 수 없습니다',
    onConfirm,
    onCancel,
}) => {
    const [cancelHovered, setCancelHovered] = useState(false);

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-60 bg-black/50 transition-opacity"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                <div
                    className="w-[400px] rounded-xl shadow-2xl"
                    style={{
                        backgroundColor: 'var(--gantt-bg-primary)',
                        border: '1px solid var(--gantt-border)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="px-5 py-4"
                        style={{ borderBottom: '1px solid var(--gantt-border-light)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3
                                    className="text-base font-bold"
                                    style={{ color: 'var(--gantt-text-primary)' }}
                                >
                                    {title}
                                </h3>
                                <p
                                    className="text-sm"
                                    style={{ color: 'var(--gantt-text-muted)' }}
                                >
                                    {description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4">
                        <div className="rounded-lg bg-red-50 p-4">
                            <p
                                className="text-sm mb-2"
                                style={{ color: 'var(--gantt-text-secondary)' }}
                            >
                                다음 항목을 삭제하시겠습니까?
                            </p>
                            <p
                                className="flex items-center gap-2 text-sm font-semibold"
                                style={{ color: 'var(--gantt-text-primary)' }}
                            >
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                {itemName}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className="flex justify-end gap-3 px-5 py-4 rounded-b-xl"
                        style={{
                            borderTop: '1px solid var(--gantt-border-light)',
                            backgroundColor: 'var(--gantt-bg-secondary)',
                        }}
                    >
                        <button
                            onClick={onCancel}
                            className={cn(
                                'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                                cancelHovered && 'gantt-bg-hover'
                            )}
                            style={{ color: 'var(--gantt-text-secondary)' }}
                            onMouseEnter={() => setCancelHovered(true)}
                            onMouseLeave={() => setCancelHovered(false)}
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

DeleteConfirmModal.displayName = 'DeleteConfirmModal';
