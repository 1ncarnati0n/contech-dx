'use client';

import { useState, useCallback, useEffect, useRef, RefObject } from 'react';
import { setupDragListeners } from './dragUtils';

// ============================================
// 공통 드래그 상태 관리 훅
// ============================================
// State-Ref 동기화 + 이벤트 리스너 관리를 하나로 통합
// useBarDrag, useGroupDrag, useDependencyDrag, useMilestoneDrag에서 공통 사용
//
// Phase 1 성능 최적화:
// - requestAnimationFrame으로 상태 업데이트 배칭
// - 프레임당 최대 1회 업데이트로 60fps 유지

export interface UseDragStateOptions<T> {
    /** 드래그 중 마우스 이동 핸들러 */
    onMove: (e: MouseEvent, state: T, setState: React.Dispatch<React.SetStateAction<T | null>>) => void;
    /** 드래그 완료 핸들러 */
    onEnd: (state: T) => void;
    /** 드래그 중 커서 스타일 */
    cursor?: 'grabbing' | 'ew-resize' | 'col-resize';
    /** RAF 배칭 사용 여부 (기본: true) */
    useRAF?: boolean;
    /**
     * Pending Update 패턴 사용 여부 (기본: false)
     * true면 드래그 완료 후에도 상태를 pendingState로 유지하여
     * 외부 props 업데이트 전까지 UI 깜빡임 방지
     */
    usePendingUpdate?: boolean;
}

export interface UseDragStateReturn<T> {
    /** 현재 드래그 상태 (null이면 드래그 중이 아님) */
    state: T | null;
    /** 상태 ref (이벤트 핸들러에서 최신 상태 접근용) */
    stateRef: RefObject<T | null>;
    /** 상태 setter (드래그 중 상태 업데이트용) */
    setState: React.Dispatch<React.SetStateAction<T | null>>;
    /** RAF 배칭을 사용하는 상태 업데이트 스케줄러 */
    scheduleUpdate: (updates: Partial<T>) => void;
    /** 드래그 시작 */
    start: (initialState: T) => void;
    /** 드래그 종료 (수동 종료 필요시) */
    stop: () => void;
    /** 드래그 중 여부 */
    isDragging: boolean;
    /** Pending 상태 여부 (드래그 완료 후 props 업데이트 대기 중) */
    isPending: boolean;
    /** Pending 상태 (드래그 완료 후 props 업데이트 전까지 유지) */
    pendingState: T | null;
    /** Pending 상태 해제 */
    clearPending: () => void;
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
    // useRAF는 향후 옵션으로 활용 가능 (현재는 항상 RAF 사용)
    useRAF: _useRAF = true,
    usePendingUpdate = false,
}: UseDragStateOptions<T>): UseDragStateReturn<T> {
    const [state, setState] = useState<T | null>(null);
    const stateRef = useRef<T | null>(null);

    // Pending Update 패턴: 드래그 완료 후 props 업데이트 전까지 상태 유지
    const [pendingState, setPendingState] = useState<T | null>(null);

    // RAF 배칭을 위한 refs
    const rafIdRef = useRef<number | null>(null);
    const pendingUpdateRef = useRef<Partial<T> | null>(null);

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

    // RAF 배칭 스케줄러: 프레임당 최대 1회 업데이트
    const scheduleUpdate = useCallback((updates: Partial<T>) => {
        // 기존 pending 업데이트와 병합
        pendingUpdateRef.current = { ...pendingUpdateRef.current, ...updates };

        // RAF가 이미 스케줄되어 있으면 스킵
        if (rafIdRef.current !== null) return;

        rafIdRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current && stateRef.current) {
                const finalUpdates = pendingUpdateRef.current;
                setState(prev => prev ? { ...prev, ...finalUpdates } : null);
                stateRef.current = stateRef.current ? { ...stateRef.current, ...finalUpdates } : null;
            }
            pendingUpdateRef.current = null;
            rafIdRef.current = null;
        });
    }, []);

    // 드래그 시작
    const start = useCallback((initialState: T) => {
        setState(initialState);
        stateRef.current = initialState;
    }, []);

    // 드래그 종료
    const stop = useCallback(() => {
        // RAF 정리
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        pendingUpdateRef.current = null;

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

    // Pending 상태 해제
    const clearPending = useCallback(() => {
        setPendingState(null);
    }, []);

    // 마우스 업 핸들러
    const handleMouseUp = useCallback(() => {
        // RAF 정리 (pending 업데이트가 있으면 즉시 적용)
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        if (pendingUpdateRef.current && stateRef.current) {
            stateRef.current = { ...stateRef.current, ...pendingUpdateRef.current };
        }
        pendingUpdateRef.current = null;

        const currentState = stateRef.current;
        if (currentState) {
            onEndRef.current(currentState);

            // Pending Update 패턴: 드래그 완료 후에도 상태 유지
            if (usePendingUpdate) {
                setPendingState(currentState);
            }
        }
        setState(null);
        stateRef.current = null;
    }, [usePendingUpdate]);

    // 이벤트 리스너 자동 관리
    useEffect(() => {
        if (state) {
            return setupDragListeners(handleMouseMove, handleMouseUp, cursor);
        }
    }, [state, handleMouseMove, handleMouseUp, cursor]);

    // 컴포넌트 언마운트 시 RAF 정리
    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    return {
        state,
        stateRef,
        setState,
        scheduleUpdate,
        start,
        stop,
        isDragging: !!state,
        isPending: !!pendingState,
        pendingState,
        clearPending,
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
