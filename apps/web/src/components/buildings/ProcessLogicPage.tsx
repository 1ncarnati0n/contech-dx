'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  FormulaSection,
  ProcessModuleSection,
  CycleDefinitionSection,
  useProcessLogicState,
} from './process-logic';
import { UnifiedSettingsModal } from './process-logic/UnifiedSettingsModal';
import { ProcessModuleEditModal } from './process-logic/ProcessModuleEditModal';
import { usePresetManager } from './process-logic/hooks/usePresetManager';
import { useFormulaEditor } from './process-logic/hooks/useFormulaEditor';
import { migrateToPreset } from '@/lib/utils/process-logic-migration';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/client';
import type { Profile, ProcessCategory, EquipmentBaseHistoryItem } from '@/lib/types';
import { isProcessModuleArray } from '@/lib/types';

interface ProcessLogicPageProps {
  projectId: string;
}

export function ProcessLogicPage({ projectId }: ProcessLogicPageProps) {
  // 프로필 상태 관리
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // 확인 다이얼로그 상태
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'cancel' | 'reset' | 'apply-preset' | null;
    presetId?: string;
  }>({ open: false, type: null });

  // 모달 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessModuleModalOpen, setIsProcessModuleModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProcessCategory>('버림');

  // 프로필 로드
  useEffect(() => {
    getCurrentUserProfile().then((p) => {
      setProfile(p);
      setIsLoadingProfile(false);
    });
  }, []);

  // 관리자 권한 체크
  const isAdmin = isSystemAdmin(profile);

  const {
    modules,
    isEditing,
    hasChanges,
    isLoading,
    toggleEditing,
    updateModules,
    save,
    resetToDefault,
    cancelChanges,
  } = useProcessLogicState({ projectId });

  // 현재 장비 기준 값 계산
  const currentEquipmentBases = useMemo(() => {
    const bases: Record<ProcessCategory, number> = {
      '버림': 650,
      '기초': 650,
      '지하층': 500,
      '셋팅층': 400,
      '기준층': 320,
      '최상층': 230,
      'PH층': 230,
      '옥탑층': 230,
      '지하주차장': 500,
      '일반층': 200,
    };

    for (const module of modules) {
      const concreteItem = module.items.find(
        (item) => item.equipmentCalculationBase !== undefined
      );
      if (concreteItem && concreteItem.equipmentCalculationBase !== undefined) {
        bases[module.category] = concreteItem.equipmentCalculationBase;
      }
    }

    return bases;
  }, [modules]);

  // UI 라벨에 맞게 매핑된 장비 기준값 (UnifiedSettingsModal용)
  const equipmentBaseValues = useMemo(() => {
    return {
      '버림': currentEquipmentBases['버림'],
      '기초': currentEquipmentBases['기초'],
      '지하층': currentEquipmentBases['지하층'],
      '1층': currentEquipmentBases['셋팅층'],
      '셋팅층': currentEquipmentBases['셋팅층'],
      '일반층': currentEquipmentBases['일반층'],
      '기준층': currentEquipmentBases['기준층'],
      '최상층': currentEquipmentBases['최상층'],
      'PH층': currentEquipmentBases['PH층'],
    };
  }, [currentEquipmentBases]);

  // 공식 편집 훅
  const {
    formulas,
    isLoading: isLoadingFormulas,
    loadFormulas,
    createFormula,
    updateFormula,
    deleteFormula,
    validateFormula,
  } = useFormulaEditor({ projectId });

  // 프리셋 관리 훅
  const {
    presets,
    activePresetId,
    isLoading: isLoadingPresets,
    loadPresets,
    applyPreset,
    saveCurrentAsPreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
  } = usePresetManager({
    projectId,
    currentModules: modules,
    currentFormulas: formulas,
    currentEquipmentBases,
  });

  // 초기 마이그레이션 및 데이터 로드
  useEffect(() => {
    // 레거시 데이터 마이그레이션
    migrateToPreset(projectId);

    // 공식 및 프리셋 로드
    loadFormulas();
    loadPresets();
  }, [projectId, loadFormulas, loadPresets]);

  const handleSave = () => {
    const success = save();
    if (success) {
      toast.success('공정로직 설정이 저장되었습니다.');
    } else {
      toast.error('저장 실패', {
        description: '설정을 저장하는 데 실패했습니다.',
      });
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setConfirmDialog({ open: true, type: 'cancel' });
    } else {
      toggleEditing();
    }
  };

  const handleResetToDefault = () => {
    setConfirmDialog({ open: true, type: 'reset' });
  };

  const handlePresetChange = (presetId: string) => {
    if (hasChanges) {
      setConfirmDialog({ open: true, type: 'apply-preset', presetId });
    } else {
      applyPresetNow(presetId);
    }
  };

  const applyPresetNow = (presetId: string) => {
    const preset = applyPreset(presetId);
    if (preset) {
      if (isProcessModuleArray(preset.modules)) {
        updateModules(preset.modules);
        toast.success(`프리셋 "${preset.name}"이(가) 적용되었습니다.`);
      } else {
        console.error('Invalid preset modules format:', preset.modules);
        toast.error('프리셋 형식이 올바르지 않습니다.');
      }
    } else {
      toast.error('프리셋 적용 실패', {
        description: '프리셋을 찾을 수 없습니다.',
      });
    }
  };

  const handleConfirmDialogAction = () => {
    if (confirmDialog.type === 'cancel') {
      cancelChanges();
      toast.info('변경 사항이 취소되었습니다.');
    } else if (confirmDialog.type === 'reset') {
      resetToDefault();
      toast.info('기본값으로 초기화되었습니다. 저장 버튼을 클릭하여 적용하세요.');
    } else if (confirmDialog.type === 'apply-preset' && confirmDialog.presetId) {
      applyPresetNow(confirmDialog.presetId);
    }
    setConfirmDialog({ open: false, type: null });
  };

  /**
   * 부위별 대당 타설량 변경 핸들러
   * 해당 카테고리의 모든 ProcessItem.equipmentCalculationBase를 업데이트하고 이력 저장
   */
  const handleEquipmentBaseChange = (category: ProcessCategory, value: number) => {
    const previousValue = currentEquipmentBases[category];

    const updatedModules = modules.map((module) => {
      // 카테고리가 일치하지 않으면 그대로 반환
      if (module.category !== category) return module;

      return {
        ...module,
        items: module.items.map((item) =>
          // equipmentCalculationBase가 있는 항목만 업데이트 (콘크리트 타설 항목)
          item.equipmentCalculationBase !== undefined
            ? { ...item, equipmentCalculationBase: value }
            : item
        ),
      };
    });

    updateModules(updatedModules);

    // 장비 기준 변경 이력 저장
    const historyKey = `contech-equipment-base-history-${projectId}`;
    const historyItem: EquipmentBaseHistoryItem = {
      timestamp: new Date().toISOString(),
      category,
      previousValue,
      newValue: value,
      changedBy: 'user',
    };

    const stored = localStorage.getItem(historyKey);
    const existing = stored ? JSON.parse(stored) : [];
    const updated = [historyItem, ...existing].slice(0, 10);
    localStorage.setItem(historyKey, JSON.stringify(updated));
  };

  // 프로필 로딩 중
  if (isLoadingProfile || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-zinc-200 border-t-zinc-600 rounded-full" />
      </div>
    );
  }

  // 관리자가 아닌 경우 접근 거부 UI
  if (!isAdmin) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
          접근 권한이 없습니다
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-md">
          공정로직은 관리자만 접근할 수 있습니다.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 계산 공식 섹션 - 프리셋 선택 통합 */}
      <FormulaSection
        modules={modules}
        presets={presets}
        activePresetId={activePresetId}
        onPresetChange={handlePresetChange}
        onSettingsClick={() => setIsSettingsOpen(true)}
        isLoadingPresets={isLoadingPresets}
      />

      {/* 공정 모듈 섹션 - 읽기 전용, 고급 편집 버튼 제공 */}
      <ProcessModuleSection
        modules={modules}
        onOpenAdvancedModal={(category) => {
          setSelectedCategory(category);
          setIsProcessModuleModalOpen(true);
        }}
      />

      {/* 사이클 정의 섹션 */}
      <CycleDefinitionSection />

      {/* 통합 설정 모달 */}
      <UnifiedSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        formulas={formulas}
        onCreateFormula={createFormula}
        onUpdateFormula={updateFormula}
        onDeleteFormula={deleteFormula}
        onValidateFormula={validateFormula}
        equipmentBaseValues={equipmentBaseValues}
        onEquipmentBaseChange={handleEquipmentBaseChange}
        presets={presets}
        activePresetId={activePresetId}
        onApplyPreset={handlePresetChange}
        onDuplicatePreset={duplicatePreset}
        onDeletePreset={deletePreset}
        onUpdatePreset={updatePreset}
        onSaveCurrentAsPreset={saveCurrentAsPreset}
      />

      {/* 공정모듈 고급 편집 모달 */}
      <ProcessModuleEditModal
        open={isProcessModuleModalOpen}
        onOpenChange={setIsProcessModuleModalOpen}
        modules={modules}
        activeCategory={selectedCategory}
        onSave={(updatedModules) => {
          updateModules(updatedModules);
          toast.success('공정모듈이 저장되었습니다.');
        }}
        projectId={projectId}
        equipmentBaseForCategory={currentEquipmentBases[selectedCategory]}
      />

      {/* 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, type: open ? confirmDialog.type : null })}
        title={
          confirmDialog.type === 'cancel'
            ? '변경 취소'
            : confirmDialog.type === 'reset'
            ? '기본값 초기화'
            : '프리셋 적용'
        }
        description={
          confirmDialog.type === 'cancel'
            ? '저장하지 않은 변경 사항이 모두 사라집니다. 정말 취소하시겠습니까?'
            : confirmDialog.type === 'reset'
            ? '모든 설정이 기본값으로 초기화됩니다. 계속하시겠습니까?'
            : '현재 설정이 변경됩니다. 저장하지 않은 변경 사항이 사라집니다. 계속하시겠습니까?'
        }
        confirmText={
          confirmDialog.type === 'cancel' ? '취소하기' : confirmDialog.type === 'reset' ? '초기화' : '적용'
        }
        cancelText="돌아가기"
        variant="warning"
        onConfirm={handleConfirmDialogAction}
      />
    </div>
  );
}
