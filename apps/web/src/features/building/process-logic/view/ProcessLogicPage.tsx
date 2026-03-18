'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Card } from '@/shared/components/ui';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import {
  FormulaSection,
  ProcessModuleSection,
  CycleDefinitionSection,
  useProcessLogicState,
} from '..';
import { UnifiedSettingsModal } from './UnifiedSettingsModal';
import { ProcessModuleEditModal } from './ProcessModuleEditModal';
import { getCurrentUserProfile, isSystemAdmin } from '@/shared/lib/permissions/client';
import type { Profile, ProcessCategory } from '@/shared/types';

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

  const isAdmin = isSystemAdmin(profile);

  const {
    modules,
    isLoading,
    equipmentBasesByCategory,
    equipmentBaseValues,
    updateModules,
    resetToDefault,
    cancelChanges,
    handleEquipmentBaseChange,
  } = useProcessLogicState({ projectId });

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

  if (isLoadingProfile || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-zinc-200 border-t-zinc-600 rounded-full" />
      </div>
    );
  }

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
      <FormulaSection
        equipmentBaseValues={equipmentBaseValues}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <ProcessModuleSection
        modules={modules}
        onOpenAdvancedModal={(category, processType) => {
          setSelectedCategory(category);
          setSelectedProcessType(processType);
          setIsProcessModuleModalOpen(true);
        }}
      />

      <CycleDefinitionSection />

      <UnifiedSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        equipmentBaseValues={equipmentBaseValues}
        onEquipmentBaseChange={handleEquipmentBaseChange}
      />

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
        equipmentBaseForCategory={equipmentBasesByCategory[selectedCategory]}
      />

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
