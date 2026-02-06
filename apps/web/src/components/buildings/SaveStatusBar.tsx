'use client';

import { Button } from '@/components/ui';

interface SaveStatusBarProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}

/**
 * 저장 상태 표시 바 — 모든 탭에서 일관된 저장 UX 제공
 * - 미저장 변경사항 amber 배지 (pulse 애니메이션)
 * - 취소 버튼 (ghost variant, 변경사항 있을 때만)
 * - 저장 버튼 (primary↔secondary 토글, disabled 상태, 로딩 텍스트)
 */
export function SaveStatusBar({
  hasUnsavedChanges,
  isSaving,
  onSave,
  onDiscard,
}: SaveStatusBarProps) {
  return (
    <div className="flex items-center gap-3">
      {hasUnsavedChanges && (
        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          저장되지 않은 변경사항
        </span>
      )}
      <div className="flex items-center gap-2">
        {hasUnsavedChanges && !isSaving && onDiscard && (
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            취소
          </Button>
        )}
        <Button
          variant={hasUnsavedChanges ? 'primary' : 'secondary'}
          size="sm"
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          loading={isSaving}
        >
          {isSaving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}
