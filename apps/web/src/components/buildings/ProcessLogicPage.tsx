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
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/client';
import type { Profile, ProcessCategory } from '@/lib/types';

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
    type: 'cancel' | 'reset' | null;
  }>({ open: false, type: null });

  // 모달 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessModuleModalOpen, setIsProcessModuleModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProcessCategory>('버림');
  const [selectedProcessType, setSelectedProcessType] = useState<string | undefined>(undefined);

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
      '주동 지하층': 500,
      '지하층(층고6.5m이상)': 500,
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
      '주동 지하층': currentEquipmentBases['주동 지하층'],
      '1층': currentEquipmentBases['셋팅층'],
      '셋팅층': currentEquipmentBases['셋팅층'],
      '일반층': currentEquipmentBases['일반층'],
      '기준층': currentEquipmentBases['기준층'],
      '최상층': currentEquipmentBases['최상층'],
      'PH층': currentEquipmentBases['PH층'],
    };
  }, [currentEquipmentBases]);

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

  const handleConfirmDialogAction = () => {
    if (confirmDialog.type === 'cancel') {
      cancelChanges();
      toast.info('변경 사항이 취소되었습니다.');
    } else if (confirmDialog.type === 'reset') {
      resetToDefault();
      toast.info('기본값으로 초기화되었습니다. 저장 버튼을 클릭하여 적용하세요.');
    }
    setConfirmDialog({ open: false, type: null });
  };

  /**
   * 부위별 대당 타설량 변경 핸들러
   * 해당 카테고리의 모든 ProcessItem.equipmentCalculationBase를 업데이트
   */
  const handleEquipmentBaseChange = (category: ProcessCategory, value: number) => {
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
      {/* 계산 공식 섹션 */}
      <FormulaSection
        modules={modules}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      {/* 공정 모듈 섹션 - 읽기 전용, 고급 편집 버튼 제공 */}
      <ProcessModuleSection
        modules={modules}
        onOpenAdvancedModal={(category, processType) => {
          setSelectedCategory(category);
          setSelectedProcessType(processType);
          setIsProcessModuleModalOpen(true);
        }}
      />

      {/* 사이클 정의 섹션 */}
      <CycleDefinitionSection />

      {/* 기준값 설정 모달 */}
      <UnifiedSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        equipmentBaseValues={equipmentBaseValues}
        onEquipmentBaseChange={handleEquipmentBaseChange}
      />

      {/* 공정모듈 고급 편집 모달 */}
      <ProcessModuleEditModal
        open={isProcessModuleModalOpen}
        onOpenChange={setIsProcessModuleModalOpen}
        modules={modules}
        activeCategory={selectedCategory}
        activeProcessType={selectedProcessType}
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
            : '기본값 초기화'
        }
        description={
          confirmDialog.type === 'cancel'
            ? '저장하지 않은 변경 사항이 모두 사라집니다. 정말 취소하시겠습니까?'
            : '모든 설정이 기본값으로 초기화됩니다. 계속하시겠습니까?'
        }
        confirmText={
          confirmDialog.type === 'cancel' ? '취소하기' : '초기화'
        }
        cancelText="돌아가기"
        variant="warning"
        onConfirm={handleConfirmDialogAction}
      />
    </div>
  );
}
