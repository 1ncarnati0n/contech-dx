'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PROCESS_MODULES, type ProcessModule } from '@/features/building/data/process-modules';
import {
  migrateTopFloorModules,
  migrateParkingModules,
} from '@/features/building/process-plan/service/process-module-migration';
import { logger } from '@/shared/utils/logger';
import type { ProcessCategory } from '@/shared/types';
import { getAllDefaultEquipmentBases } from './process-module-helpers';

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
        const { modules: migratedModules1, migrated: topFloorMigrated } = migrateTopFloorModules(parsed);

        // 🔄 마이그레이션: 지하주차장에서 버림/기초 항목 제거
        const { modules: migratedModules2, migrated: parkingMigrated } = migrateParkingModules(migratedModules1);

        if (topFloorMigrated || parkingMigrated) {
          logger.info('[Migration] 공정 모듈 자동 마이그레이션 완료:', {
            최상층: topFloorMigrated ? '거푸집 해체/정리 제거 (7개→6개)' : '변경 없음',
            지하주차장: parkingMigrated ? '버림/기초 항목 제거 (20개→14개)' : '변경 없음',
          });
          // 마이그레이션된 데이터를 localStorage에 다시 저장
          localStorage.setItem(storageKey, JSON.stringify(migratedModules2));
        }

        queueMicrotask(() => {
          setState((prev) => ({
            ...prev,
            modules: migratedModules2,
            isLoading: false,
          }));
        });
      } else {
        queueMicrotask(() => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        });
      }
    } catch (error) {
      logger.error('Failed to load process logic settings:', error);
      queueMicrotask(() => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      });
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
      logger.error('Failed to save process logic settings:', error);
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
      logger.error('Failed to clear saved settings:', error);
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
        const { modules: migratedModules1 } = migrateTopFloorModules(parsed);
        const { modules: migratedModules2 } = migrateParkingModules(migratedModules1);

        setState((prev) => ({
          ...prev,
          modules: migratedModules2,
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
      logger.error('Failed to cancel changes:', error);
    }
  }, [storageKey]);

  // 카테고리별 장비 기준값 계산
  const equipmentBasesByCategory = useMemo(() => {
    const bases = getAllDefaultEquipmentBases();

    for (const mod of state.modules) {
      const concreteItem = mod.items.find(
        (item) => item.equipmentCalculationBase !== undefined
      );
      if (concreteItem && concreteItem.equipmentCalculationBase !== undefined) {
        bases[mod.category] = concreteItem.equipmentCalculationBase;
      }
    }

    return bases;
  }, [state.modules]);

  // UI 라벨 매핑된 장비 기준값 (설정 모달용)
  const equipmentBaseValues = useMemo(() => {
    return {
      '버림': equipmentBasesByCategory['버림'],
      '기초': equipmentBasesByCategory['기초'],
      '주동 지하층': equipmentBasesByCategory['주동 지하층'],
      '1층': equipmentBasesByCategory['셋팅층'],
      '셋팅층': equipmentBasesByCategory['셋팅층'],
      '일반층': equipmentBasesByCategory['일반층'],
      '기준층': equipmentBasesByCategory['기준층'],
      '최상층': equipmentBasesByCategory['최상층'],
      '옥탑층': equipmentBasesByCategory['옥탑층'],
    };
  }, [equipmentBasesByCategory]);

  // 부위별 대당 타설량 변경
  const handleEquipmentBaseChange = useCallback((category: ProcessCategory, value: number) => {
    const updatedModules = state.modules.map((mod) => {
      if (mod.category !== category) return mod;

      return {
        ...mod,
        items: mod.items.map((item) =>
          item.equipmentCalculationBase !== undefined
            ? { ...item, equipmentCalculationBase: value }
            : item
        ),
      };
    });

    updateModules(updatedModules);
  }, [state.modules, updateModules]);

  return {
    modules: state.modules,
    isEditing: state.isEditing,
    hasChanges: state.hasChanges,
    isLoading: state.isLoading,
    equipmentBasesByCategory,
    equipmentBaseValues,
    toggleEditing,
    updateModules,
    save,
    resetToDefault,
    clearSaved,
    cancelChanges,
    handleEquipmentBaseChange,
  };
}
