'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProcessLogicPreset, CalculationFormula, ProcessCategory } from '@/lib/types';
import type { ProcessModule } from '@/lib/data/process-modules';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

const STORAGE_PRESETS_KEY = 'contech-process-presets';
const STORAGE_ACTIVE_PRESET_PREFIX = 'contech-active-preset-';

interface UsePresetManagerOptions {
  projectId: string;
  currentModules: ProcessModule[];
  currentFormulas: CalculationFormula[];
  currentEquipmentBases: Record<ProcessCategory, number>;
}

interface UsePresetManagerReturn {
  presets: ProcessLogicPreset[];
  activePresetId: string | null;
  isLoading: boolean;

  // Actions
  loadPresets: () => void;
  createPreset: (preset: Omit<ProcessLogicPreset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePreset: (id: string, updates: Partial<Omit<ProcessLogicPreset, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deletePreset: (id: string) => void;
  duplicatePreset: (id: string, newName: string) => void;
  applyPreset: (id: string) => ProcessLogicPreset | null;
  setActivePreset: (id: string | null) => void;
  saveCurrentAsPreset: (name: string, description?: string, isDefault?: boolean) => void;
}

/**
 * 프리셋 관리 훅
 *
 * localStorage에서 프리셋 목록을 관리하고,
 * 프리셋 생성/수정/삭제/적용 기능을 제공합니다.
 */
export function usePresetManager({
  projectId,
  currentModules,
  currentFormulas,
  currentEquipmentBases,
}: UsePresetManagerOptions): UsePresetManagerReturn {
  const [presets, setPresets] = useState<ProcessLogicPreset[]>([]);
  const [activePresetId, setActivePresetIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('user');

  const activePresetStorageKey = `${STORAGE_ACTIVE_PRESET_PREFIX}${projectId}`;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.email ?? user.id);
    });
  }, []);

  // 프리셋 ID 생성
  const generatePresetId = useCallback(() => {
    return `preset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // localStorage에서 프리셋 목록 로드
  const loadPresets = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_PRESETS_KEY);
      const activePresetId = localStorage.getItem(activePresetStorageKey);

      if (stored) {
        const parsed = JSON.parse(stored) as ProcessLogicPreset[];
        // 프로젝트 ID가 일치하거나 전역 프리셋만 필터링
        const filtered = parsed.filter(
          (p) => p.projectId === projectId || !p.projectId
        );
        setPresets(filtered);
      }

      setActivePresetIdState(activePresetId);
      setIsLoading(false);
    } catch (error) {
      logger.error('Failed to load presets:', error);
      setIsLoading(false);
    }
  }, [projectId, activePresetStorageKey]);

  // localStorage에 프리셋 저장
  const savePresetsToStorage = useCallback((updatedPresets: ProcessLogicPreset[]) => {
    if (typeof window === 'undefined') return;

    try {
      // 기존에 저장된 다른 프로젝트의 프리셋도 유지
      const allStored = localStorage.getItem(STORAGE_PRESETS_KEY);
      const allPresets = allStored ? (JSON.parse(allStored) as ProcessLogicPreset[]) : [];

      // 현재 프로젝트가 아닌 프리셋은 유지
      const otherProjectPresets = allPresets.filter(
        (p) => p.projectId !== projectId && p.projectId !== undefined
      );

      // 전역 프리셋 + 현재 프로젝트 프리셋 + 다른 프로젝트 프리셋
      const globalPresets = updatedPresets.filter((p) => !p.projectId);
      const currentProjectPresets = updatedPresets.filter((p) => p.projectId === projectId);
      const merged = [...globalPresets, ...currentProjectPresets, ...otherProjectPresets];

      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(merged));
      setPresets(updatedPresets);
    } catch (error) {
      logger.error('Failed to save presets:', error);
    }
  }, [projectId]);

  // 초기 로드
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // 프리셋 생성
  const createPreset = useCallback(
    (preset: Omit<ProcessLogicPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newPreset: ProcessLogicPreset = {
        ...preset,
        id: generatePresetId(),
        createdAt: now,
        updatedAt: now,
      };

      const updated = [...presets, newPreset];
      savePresetsToStorage(updated);
    },
    [presets, generatePresetId, savePresetsToStorage]
  );

  // 프리셋 수정
  const updatePreset = useCallback(
    (id: string, updates: Partial<Omit<ProcessLogicPreset, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const updated = presets.map((p) =>
        p.id === id
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      );
      savePresetsToStorage(updated);
    },
    [presets, savePresetsToStorage]
  );

  // 프리셋 삭제
  const deletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      savePresetsToStorage(updated);

      // 삭제된 프리셋이 활성 프리셋이면 초기화
      if (activePresetId === id) {
        setActivePresetIdState(null);
        localStorage.removeItem(activePresetStorageKey);
      }
    },
    [presets, activePresetId, activePresetStorageKey, savePresetsToStorage]
  );

  // 프리셋 복제
  const duplicatePreset = useCallback(
    (id: string, newName: string) => {
      const original = presets.find((p) => p.id === id);
      if (!original) return;

      const now = new Date().toISOString();
      const duplicated: ProcessLogicPreset = {
        ...original,
        id: generatePresetId(),
        name: newName,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [...presets, duplicated];
      savePresetsToStorage(updated);
    },
    [presets, generatePresetId, savePresetsToStorage]
  );

  // 프리셋 적용 (모듈, 공식, 장비기준 반환)
  const applyPreset = useCallback(
    (id: string): ProcessLogicPreset | null => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return null;

      setActivePresetIdState(id);
      localStorage.setItem(activePresetStorageKey, id);

      return preset;
    },
    [presets, activePresetStorageKey]
  );

  // 활성 프리셋 설정
  const setActivePreset = useCallback(
    (id: string | null) => {
      setActivePresetIdState(id);
      if (id) {
        localStorage.setItem(activePresetStorageKey, id);
      } else {
        localStorage.removeItem(activePresetStorageKey);
      }
    },
    [activePresetStorageKey]
  );

  // 현재 설정을 프리셋으로 저장
  const saveCurrentAsPreset = useCallback(
    (name: string, description?: string, isDefault = false) => {
      createPreset({
        name,
        description,
        projectId,
        isDefault,
        modules: currentModules,
        formulas: currentFormulas,
        equipmentBases: currentEquipmentBases,
        createdBy: userId,
      });
    },
    [projectId, currentModules, currentFormulas, currentEquipmentBases, createPreset, userId]
  );

  return {
    presets,
    activePresetId,
    isLoading,
    loadPresets,
    createPreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    applyPreset,
    setActivePreset,
    saveCurrentAsPreset,
  };
}
