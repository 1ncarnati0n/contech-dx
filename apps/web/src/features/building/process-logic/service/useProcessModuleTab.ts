'use client';

import { useState, useMemo } from 'react';
import type { ProcessModule } from '@/features/building/data/process-modules';
import type { ProcessCategory } from '@/shared/types';

type TabId = ProcessCategory;

const CATEGORY_TABS: { id: TabId; label: string; category: ProcessCategory; processType?: string; moduleId?: string }[] = [
  { id: '버림', label: '버림', category: '버림', moduleId: 'blinding-standard' },
  { id: '기초', label: '기초', category: '기초', moduleId: 'foundation-standard' },
  { id: '지하주차장', label: '지하주차장', category: '지하주차장', moduleId: 'parking-standard' },
  { id: '지하층(층고6.5m이상)', label: '지하층(층고6.5m이상)', category: '지하층(층고6.5m이상)', moduleId: 'basement-high-ceiling' },
  { id: '주동 지하층', label: '주동 지하층', category: '주동 지하층', moduleId: 'basement-with-pit' },
  { id: '일반층', label: '일반층', category: '일반층' },
  { id: '셋팅층', label: '셋팅층', category: '셋팅층' },
  { id: '기준층', label: '기준층', category: '기준층' },
  { id: '최상층', label: '최상층', category: '최상층' },
  { id: '옥탑층', label: '옥탑층', category: '옥탑층' },
];

const CYCLE_ORDER: Record<string, number> = {
  '표준공정': 0, '5일 사이클': 1, '6일 사이클': 2, '7일 사이클': 3, '8일 사이클': 4,
};

interface UseProcessModuleTabOptions {
  modules: ProcessModule[];
}

export function useProcessModuleTab({ modules }: UseProcessModuleTabOptions) {
  const [activeTab, setActiveTab] = useState<TabId>('버림');
  const [selectedCyclePerTab, setSelectedCyclePerTab] = useState<Record<string, string>>({});

  // 현재 탭에 해당하는 모듈들 필터링
  const categoryModules = useMemo(() => {
    const currentTab = CATEGORY_TABS.find(t => t.id === activeTab);
    if (!currentTab) return [];

    // moduleId가 지정된 경우 해당 모듈만 반환
    if (currentTab.moduleId) {
      const mod = modules.find(m => m.id === currentTab.moduleId);
      return mod ? [mod] : [];
    }

    // moduleId가 없는 경우 기존 로직 사용
    return modules.filter((m) => {
      if (m.category !== currentTab.category) return false;
      if (currentTab.processType) {
        return m.name === currentTab.processType;
      }
      return true;
    }).sort((a, b) => (CYCLE_ORDER[a.name] ?? 99) - (CYCLE_ORDER[b.name] ?? 99));
  }, [modules, activeTab]);

  // 선택된 사이클 모듈
  const primaryModule = useMemo(() => {
    if (categoryModules.length === 0) return undefined;
    const selectedId = selectedCyclePerTab[activeTab];
    if (selectedId) {
      const found = categoryModules.find(m => m.id === selectedId);
      if (found) return found;
    }
    return categoryModules[0];
  }, [categoryModules, selectedCyclePerTab, activeTab]);

  // 현재 탭의 실제 카테고리
  const currentCategory = useMemo(() => {
    const currentTab = CATEGORY_TABS.find(t => t.id === activeTab);
    return currentTab?.category || (activeTab as ProcessCategory);
  }, [activeTab]);

  const selectCycle = (moduleId: string) => {
    setSelectedCyclePerTab(prev => ({ ...prev, [activeTab]: moduleId }));
  };

  return {
    tabs: CATEGORY_TABS,
    activeTab,
    setActiveTab,
    categoryModules,
    primaryModule,
    currentCategory,
    selectCycle,
  };
}
