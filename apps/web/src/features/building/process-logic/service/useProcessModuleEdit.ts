'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { ProcessModule, ProcessItem } from '@/features/building/data/process-modules';
import type { ProcessCategory } from '@/shared/types';

export type EditableField = 'dailyProductivity' | 'directWorkDays' | 'indirectDays' | 'equipmentWorkersPerUnit' | 'quantityReference';

export type FlattenedItem = ProcessItem & { moduleId: string; moduleName: string };

interface UseProcessModuleEditOptions {
  open: boolean;
  modules: ProcessModule[];
  activeCategory: ProcessCategory;
  activeProcessType?: string;
  equipmentBaseForCategory: number;
  onSave: (updatedModules: ProcessModule[]) => void;
  onClose: () => void;
}

export function useProcessModuleEdit({
  open,
  modules,
  activeCategory,
  activeProcessType,
  equipmentBaseForCategory,
  onSave,
  onClose,
}: UseProcessModuleEditOptions) {
  const [editValues, setEditValues] = useState<ProcessModule[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 모달이 열릴 때 modules 복사 및 equipmentCalculationBase 동기화
  useEffect(() => {
    if (!open) return;

    const syncedModules = modules.map(module => {
      if (module.category !== activeCategory) return module;

      return {
        ...module,
        items: module.items.map(item => {
          if (item.equipmentCalculationBase !== undefined) {
            return { ...item, equipmentCalculationBase: equipmentBaseForCategory };
          }
          return item;
        })
      };
    });

    queueMicrotask(() => {
      setEditValues(syncedModules);
    });
  }, [open, modules, activeCategory, equipmentBaseForCategory]);

  // 현재 카테고리의 모듈 필터링
  const filteredModules = useMemo(() => {
    return editValues.filter(m => {
      if (m.category !== activeCategory) return false;
      if (activeProcessType) return m.name === activeProcessType;
      return true;
    });
  }, [editValues, activeCategory, activeProcessType]);

  // 현재 카테고리의 모든 항목 (평탄화)
  const filteredItems: FlattenedItem[] = useMemo(() => {
    return filteredModules.flatMap(m => m.items.map(item => ({ ...item, moduleId: m.id, moduleName: m.name })));
  }, [filteredModules]);

  // 변경된 항목 Set 계산
  const changedItemIds = useMemo(() => {
    const changedSet = new Set<string>();

    modules.forEach((originalModule) => {
      const editedModule = editValues.find(m => m.id === originalModule.id);
      if (!editedModule) return;

      originalModule.items.forEach((originalItem) => {
        const editedItem = editedModule.items.find(i => i.id === originalItem.id);
        if (!editedItem) return;

        const fields: EditableField[] = [
          'dailyProductivity',
          'directWorkDays',
          'indirectDays',
          'equipmentWorkersPerUnit',
          'quantityReference',
        ];

        const isChanged = fields.some(field => originalItem[field] !== editedItem[field]);
        if (isChanged) {
          changedSet.add(originalItem.id);
        }
      });
    });

    return changedSet;
  }, [modules, editValues]);

  // 변경 확인 (O(1))
  const isItemChanged = useCallback((itemId: string): boolean => {
    return changedItemIds.has(itemId);
  }, [changedItemIds]);

  // 필드 값 가져오기
  const getFieldValue = useCallback((item: ProcessItem & { moduleId: string }, field: EditableField): string => {
    const value = item[field];
    return value === undefined ? '' : String(value);
  }, []);

  // 개별 필드 변경
  const handleFieldChange = useCallback((moduleId: string, itemId: string, field: EditableField, value: string) => {
    // 에러 초기화
    const errorKey = `${itemId}-${field}`;
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });

    // 숫자 필드 검증
    if (field !== 'quantityReference') {
      if (value !== '' && isNaN(parseFloat(value))) {
        setFieldErrors(prev => ({ ...prev, [errorKey]: '숫자를 입력하세요' }));
        return;
      }
      if (value !== '' && parseFloat(value) < 0) {
        setFieldErrors(prev => ({ ...prev, [errorKey]: '0 이상의 값을 입력하세요' }));
        return;
      }
    }

    setEditValues(prev => prev.map(module => {
      if (module.id !== moduleId) return module;

      return {
        ...module,
        items: module.items.map(item => {
          if (item.id !== itemId) return item;

          const parsedValue = field === 'quantityReference'
            ? value
            : (value === '' ? undefined : parseFloat(value));

          return { ...item, [field]: parsedValue };
        }),
      };
    }));
  }, []);

  // 드래그 종료 핸들러
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = filteredItems.findIndex(item => item.id === active.id);
    const newIndex = filteredItems.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = arrayMove(filteredItems, oldIndex, newIndex);

    setEditValues(prev => prev.map(module => {
      if (module.category !== activeCategory) return module;

      return {
        ...module,
        items: reorderedItems.filter(item => item.moduleId === module.id),
      };
    }));
  }, [filteredItems, activeCategory]);

  // 저장
  const handleSave = useCallback(() => {
    if (changedItemIds.size > 0) {
      onSave(editValues);
    }
    onClose();
  }, [changedItemIds, editValues, onSave, onClose]);

  // 취소
  const handleCancel = useCallback(() => {
    setEditValues(modules);
    onClose();
  }, [modules, onClose]);

  return {
    filteredItems,
    fieldErrors,
    changedItemIds,
    isItemChanged,
    getFieldValue,
    handleFieldChange,
    handleDragEnd,
    handleSave,
    handleCancel,
  };
}
