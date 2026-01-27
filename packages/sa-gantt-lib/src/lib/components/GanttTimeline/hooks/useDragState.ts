'use client';

import { useState, useCallback, useEffect, useRef, RefObject } from 'react';
import { setupDragListeners } from './dragUtils';

// ============================================
// 공통 드래그 상태 관리 훅
// ============================================
// State-Ref 동기화 + 이벤트 리스너 관리를 하나로 통합
// useBarDrag, useGroupDrag, useDependencyDrag, useMilestoneDrag에서 공통 사용

export interface UseDragStateOptions<T> {
    /** 드래그 중 마우스 이동 핸들러 */
    onMove: (e: MouseEvent, state: T, setState: React.Dispatch<React.SetStateAction<T | null>>) => void;
    /** 드래그 완료 핸들러 */
    onEnd: (state: T) => void;
    /** 드래그 중 커서 스타일 */
    cursor?: 'grabbing' | 'ew-resize' | 'col-resize';
}

export interface UseDragStateReturn<T> {
    /** 현재 드래그 상태 (null이면 드래그 중이 아님) */
    state: T | null;
    /** 상태 ref (이벤트 핸들러에서 최신 상태 접근용) */
    stateRef: RefObject<T | null>;
    /** 상태 setter (드래그 중 상태 업데이트용) */
    setState: React.Dispatch<React.SetStateAction<T | null>>;
    /** 드래그 시작 */
    start: (initialState: T) => void;
    /** 드래그 종료 (수동 종료 필요시) */
    stop: () => void;
    /** 드래그 중 여부 */
    isDragging: boolean;
}

/**
 * 공통 드래그 상태 관리 훅
 *
 * @example
 * ```typescript
 * const { state, stateRef, setState, start, isDragging } = useDragState({
 *     onMove: (e, state, setState) => {
 *         // 드래그 중 상태 업데이트
 *         setState(prev => prev ? { ...prev, deltaX: e.clientX } : null);
 *     },
 *     onEnd: (state) => {
 *         // 드래그 완료 처리
 *     },
 *     cursor: 'grabbing',
 * });
 * ```
 */
export function useDragState<T extends object>({
    onMove,
    onEnd,
    cursor = 'grabbing',
}: UseDragStateOptions<T>): UseDragStateReturn<T> {
    const [state, setState] = useState<T | null>(null);
    const stateRef = useRef<T | null>(null);

    // 콜백 ref (클로저 문제 방지)
    const onMoveRef = useRef(onMove);
    const onEndRef = useRef(onEnd);

    // 콜백 ref 업데이트
    useEffect(() => {
        onMoveRef.current = onMove;
        onEndRef.current = onEnd;
    }, [onMove, onEnd]);

    // State → Ref 동기화 (이벤트 핸들러에서 최신 상태 접근용)
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // 드래그 시작
    const start = useCallback((initialState: T) => {
        setState(initialState);
        stateRef.current = initialState;
    }, []);

    // 드래그 종료
    const stop = useCallback(() => {
        setState(null);
        stateRef.current = null;
    }, []);

    // 마우스 이동 핸들러 (ref 사용으로 클로저 문제 방지)
    const handleMouseMove = useCallback((e: MouseEvent) => {
        const currentState = stateRef.current;
        if (currentState) {
            onMoveRef.current(e, currentState, setState);
        }
    }, []);

    // 마우스 업 핸들러
    const handleMouseUp = useCallback(() => {
        const currentState = stateRef.current;
        if (currentState) {
            onEndRef.current(currentState);
        }
        setState(null);
        stateRef.current = null;
    }, []);

    // 이벤트 리스너 자동 관리
    useEffect(() => {
        if (state) {
            return setupDragListeners(handleMouseMove, handleMouseUp, cursor);
        }
    }, [state, handleMouseMove, handleMouseUp, cursor]);

    return {
        state,
        stateRef,
        setState,
        start,
        stop,
        isDragging: !!state,
    };
}

/**
 * 드래그 상태 업데이트 헬퍼
 * 기존 상태에서 일부만 업데이트할 때 사용
 */
export function updateDragState<T extends object>(
    setState: React.Dispatch<React.SetStateAction<T | null>>,
    updates: Partial<T>
): void {
    setState(prev => prev ? { ...prev, ...updates } : null);
}
