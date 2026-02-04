'use client';

import { useState, useEffect, useCallback } from 'react';
import { PROCESS_MODULES, type ProcessModule } from '@/lib/data/process-modules';
import { migrateTopFloorModules } from '@/lib/utils/process-module-migration';

const STORAGE_KEY_PREFIX = 'contech-process-logic-';

interface UseProcessLogicStateOptions {
  projectId: string;
}

interface ProcessLogicState {
  modules: ProcessModule[];
  isEditing: boolean;
  hasChanges: boolean;
  isLoading: boolean;
}

export function useProcessLogicState({ projectId }: UseProcessLogicStateOptions) {
  const [state, setState] = useState<ProcessLogicState>({
    modules: PROCESS_MODULES,
    isEditing: false,
    hasChanges: false,
    isLoading: true,
  });

  const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;

  // localStorage에서 저장된 설정 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ProcessModule[];

        // 🔄 마이그레이션: 최상층에서 거푸집 해체/정리 제거
        const { modules: migratedModules, migrated } = migrateTopFloorModules(parsed);

        if (migrated) {
          console.log('[Migration] 최상층 공정 모듈 자동 마이그레이션: 7개→6개 (거푸집 해체/정리 제거)');
          // 마이그레이션된 데이터를 localStorage에 다시 저장
          localStorage.setItem(storageKey, JSON.stringify(migratedModules));
        }

        setState((prev) => ({
          ...prev,
          modules: migratedModules,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load process logic settings:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [storageKey]);

  // 편집 모드 토글
  const toggleEditing = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isEditing: !prev.isEditing,
    }));
  }, []);

  // 모듈 업데이트
  const updateModules = useCallback((modules: ProcessModule[]) => {
    setState((prev) => ({
      ...prev,
      modules,
      hasChanges: true,
    }));
  }, []);

  // 저장
  const save = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(state.modules));
      setState((prev) => ({
        ...prev,
        hasChanges: false,
        isEditing: false,
      }));
      return true;
    } catch (error) {
      console.error('Failed to save process logic settings:', error);
      return false;
    }
  }, [storageKey, state.modules]);

  // 기본값으로 리셋
  const resetToDefault = useCallback(() => {
    setState((prev) => ({
      ...prev,
      modules: PROCESS_MODULES,
      hasChanges: true,
    }));
  }, []);

  // 저장된 설정 삭제
  const clearSaved = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(storageKey);
      setState((prev) => ({
        ...prev,
        modules: PROCESS_MODULES,
        hasChanges: false,
      }));
    } catch (error) {
      console.error('Failed to clear saved settings:', error);
    }
  }, [storageKey]);

  // 변경 취소
  const cancelChanges = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ProcessModule[];

        // 마이그레이션 적용 (취소 시에도 최신 데이터 사용)
        const { modules: migratedModules } = migrateTopFloorModules(parsed);

        setState((prev) => ({
          ...prev,
          modules: migratedModules,
          hasChanges: false,
          isEditing: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          modules: PROCESS_MODULES,
          hasChanges: false,
          isEditing: false,
        }));
      }
    } catch (error) {
      console.error('Failed to cancel changes:', error);
    }
  }, [storageKey]);

  return {
    modules: state.modules,
    isEditing: state.isEditing,
    hasChanges: state.hasChanges,
    isLoading: state.isLoading,
    toggleEditing,
    updateModules,
    save,
    resetToDefault,
    clearSaved,
    cancelChanges,
  };
}
