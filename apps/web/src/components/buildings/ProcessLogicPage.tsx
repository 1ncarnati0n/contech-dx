'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui';
import {
  FormulaSection,
  ProcessModuleSection,
  CycleDefinitionSection,
  useProcessLogicState,
} from './process-logic';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/client';
import type { Profile } from '@/lib/types';

interface ProcessLogicPageProps {
  projectId: string;
}

export function ProcessLogicPage({ projectId }: ProcessLogicPageProps) {
  // 프로필 상태 관리
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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
      if (window.confirm('변경 사항을 취소하시겠습니까?')) {
        cancelChanges();
        toast.info('변경 사항이 취소되었습니다.');
      }
    } else {
      toggleEditing();
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
      resetToDefault();
      toast.info('기본값으로 초기화되었습니다. 저장 버튼을 클릭하여 적용하세요.');
    }
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
      <FormulaSection isEditing={isEditing} />

      {/* 공정 모듈 섹션 - 편집 버튼이 이 섹션 헤더에 있음 */}
      <ProcessModuleSection
        isEditing={isEditing}
        modules={modules}
        hasChanges={hasChanges}
        onModuleChange={updateModules}
        onResetToDefault={handleResetToDefault}
        onToggleEditing={toggleEditing}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* 사이클 정의 섹션 */}
      <CycleDefinitionSection isEditing={isEditing} />
    </div>
  );
}
