'use client';

import { useState, useCallback, useRef } from 'react';
import { produce, enablePatches, applyPatches, Patch } from 'immer';
import { shallowEqualHistoryState } from '../utils/comparisonUtils';

// Immer patches 기능 활성화
enablePatches();

/**
 * 패치 기반 히스토리 항목
 * 전체 상태 대신 변경 패치만 저장하여 메모리 효율 향상
 */
interface PatchEntry {
    /** 되돌리기용 패치 */
    undo: Patch[];
    /** 다시 실행용 패치 */
    redo: Patch[];
}

/**
 * 히스토리 상태 인터페이스
 */
interface HistoryState<T> {
    /** 이전 변경 패치들 */
    past: PatchEntry[];
    /** 현재 상태 */
    present: T;
    /** 취소된 변경 패치들 */
    future: PatchEntry[];
}

/**
 * useHistory 훅 반환 타입
 */
interface UseHistoryReturn<T> {
    /** 현재 상태 */
    present: T;
    /** 상태 변경 (히스토리에 기록) */
    set: (newState: T | ((prev: T) => T)) => void;
    /** 실행 취소 */
    undo: () => void;
    /** 다시 실행 */
    redo: () => void;
    /** 실행 취소 가능 여부 */
    canUndo: boolean;
    /** 다시 실행 가능 여부 */
    canRedo: boolean;
    /** 히스토리 초기화 (새 초기값으로) */
    reset: (initialState: T) => void;
    /** 히스토리 전체 초기화 (현재 상태 유지) */
    clearHistory: () => void;
    /** 히스토리 개수 정보 */
    historyLength: { past: number; future: number };
}

/** 최대 히스토리 개수 */
const MAX_HISTORY_LENGTH = 50;

/**
 * 깊은 복사 유틸리티 함수 (초기화 시에만 사용)
 * Date 객체와 Set 등 특수 타입도 처리
 */
function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as T;
    }

    if (obj instanceof Set) {
        return new Set(Array.from(obj).map(item => deepClone(item))) as T;
    }

    if (obj instanceof Map) {
        return new Map(Array.from(obj.entries()).map(([k, v]) => [deepClone(k), deepClone(v)])) as T;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * Undo/Redo 기능을 제공하는 히스토리 관리 훅
 *
 * Immer의 patches 기능을 활용하여 전체 상태 대신 변경 패치만 저장합니다.
 * 이를 통해 메모리 사용량을 크게 줄이면서 동일한 기능을 제공합니다.
 *
 * @param initialState 초기 상태
 * @returns 히스토리 관리 함수들과 현재 상태
 *
 * @example
 * ```tsx
 * const { present, set, undo, redo, canUndo, canRedo } = useHistory({ count: 0 });
 *
 * // 상태 변경 (히스토리에 기록됨)
 * set({ count: 1 });
 *
 * // 이전 값으로 되돌리기
 * undo(); // count: 0
 *
 * // 다시 실행
 * redo(); // count: 1
 * ```
 */
export function useHistory<T>(initialState: T): UseHistoryReturn<T> {
    const [history, setHistory] = useState<HistoryState<T>>(() => ({
        past: [],
        present: deepClone(initialState),
        future: [],
    }));

    // 초기화 여부 추적 (초기 로드 시 히스토리에 기록하지 않기 위함)
    const isInitialized = useRef(false);

    /**
     * 상태 변경 (히스토리에 기록)
     * Immer의 produceWithPatches를 사용하여 패치만 저장
     */
    const set = useCallback((newState: T | ((prev: T) => T)) => {
        setHistory(prev => {
            const resolvedState = typeof newState === 'function'
                ? (newState as (prev: T) => T)(prev.present)
                : newState;

            // 초기화 전이면 present만 업데이트 (히스토리에 기록 안 함)
            if (!isInitialized.current) {
                isInitialized.current = true;
                return {
                    past: [],
                    present: deepClone(resolvedState),
                    future: [],
                };
            }

            // 이전 상태와 동일하면 무시 (얕은 비교로 성능 최적화)
            if (shallowEqualHistoryState(
                prev.present as Record<string, unknown>,
                resolvedState as Record<string, unknown>
            )) {
                return prev;
            }

            // Immer를 사용하여 패치 생성
            let patches: Patch[] = [];
            let inversePatches: Patch[] = [];

            const nextState = produce(
                prev.present,
                (draft) => {
                    // 새 상태로 교체
                    Object.keys(draft as object).forEach(key => {
                        delete (draft as Record<string, unknown>)[key];
                    });
                    Object.assign(draft as object, resolvedState);
                },
                (p, ip) => {
                    patches = p;
                    inversePatches = ip;
                }
            );

            // 새 히스토리 항목 추가
            const newPast = [...prev.past, { undo: inversePatches, redo: patches }];

            // 최대 개수 초과 시 오래된 것 제거
            if (newPast.length > MAX_HISTORY_LENGTH) {
                newPast.shift();
            }

            return {
                past: newPast,
                present: nextState,
                future: [], // 새 변경 시 future 초기화
            };
        });
    }, []);

    /**
     * 실행 취소 (Undo)
     * 저장된 inversePatches를 적용하여 이전 상태로 복원
     */
    const undo = useCallback(() => {
        setHistory(prev => {
            if (prev.past.length === 0) return prev;

            const newPast = [...prev.past];
            const lastEntry = newPast.pop()!;

            // inversePatches 적용하여 이전 상태 복원
            const previousState = applyPatches(prev.present as object, lastEntry.undo) as T;

            return {
                past: newPast,
                present: previousState,
                future: [lastEntry, ...prev.future],
            };
        });
    }, []);

    /**
     * 다시 실행 (Redo)
     * 저장된 patches를 적용하여 다음 상태로 이동
     */
    const redo = useCallback(() => {
        setHistory(prev => {
            if (prev.future.length === 0) return prev;

            const newFuture = [...prev.future];
            const nextEntry = newFuture.shift()!;

            // patches 적용하여 다음 상태 복원
            const nextState = applyPatches(prev.present as object, nextEntry.redo) as T;

            return {
                past: [...prev.past, nextEntry],
                present: nextState,
                future: newFuture,
            };
        });
    }, []);

    /**
     * 히스토리 초기화 (새 초기값으로)
     */
    const reset = useCallback((newInitialState: T) => {
        isInitialized.current = false;
        setHistory({
            past: [],
            present: deepClone(newInitialState),
            future: [],
        });
    }, []);

    /**
     * 히스토리 전체 초기화 (현재 상태 유지)
     */
    const clearHistory = useCallback(() => {
        setHistory(prev => ({
            past: [],
            present: prev.present,
            future: [],
        }));
    }, []);

    return {
        present: history.present,
        set,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        reset,
        clearHistory,
        historyLength: {
            past: history.past.length,
            future: history.future.length,
        },
    };
}

export default useHistory;
