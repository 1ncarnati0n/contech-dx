'use client';

/**
 * 범용 삭제 버튼 컴포넌트
 *
 * 리소스 삭제 시 확인 다이얼로그와 에러 처리를 통합합니다.
 * DeletePostButton, DeleteCommentButton 등에서 재사용됩니다.
 */

import { useState } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui';
import { ConfirmDialog } from './ConfirmDialog';
import { Trash2 } from 'lucide-react';
import { useErrorHandler } from '@/shared/hooks';
import { showSuccess } from '@/shared/utils/error-handler';

type TableName = 'posts' | 'comments' | 'buildings' | 'projects';

interface DeleteResourceButtonProps {
  /** 삭제할 리소스 ID */
  resourceId: string;
  /** Supabase 테이블명 */
  tableName: TableName;
  /** 삭제 후 리디렉션 경로 (선택) */
  redirectTo?: string;
  /** 확인 다이얼로그 제목 */
  confirmTitle: string;
  /** 확인 다이얼로그 설명 */
  confirmDescription: string;
  /** 성공 메시지 */
  successMessage: string;
  /** 에러 컨텍스트 (로깅용) */
  errorContext: string;
  /** 삭제 성공 후 콜백 (선택) */
  onDeleteSuccess?: () => void;
  /** 버튼 variant */
  buttonVariant?: 'ghost' | 'outline' | 'secondary';
  /** 버튼 크기 */
  buttonSize?: 'sm' | 'icon' | 'md';
  /** 레이블 표시 여부 */
  showLabel?: boolean;
  /** 추가 클래스 */
  className?: string;
}

export function DeleteResourceButton({
  resourceId,
  tableName,
  redirectTo,
  confirmTitle,
  confirmDescription,
  successMessage,
  errorContext,
  onDeleteSuccess,
  buttonVariant = 'ghost',
  buttonSize = 'sm',
  showLabel = true,
  className = '',
}: DeleteResourceButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const handleError = useErrorHandler(errorContext);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', resourceId);

      if (error) {
        handleError(error);
        return;
      }

      showSuccess(successMessage);
      onDeleteSuccess?.();

      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  // 레이블 포함 스타일
  const labelButtonClass = `gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 ${className}`;

  // 아이콘만 스타일
  const iconButtonClass = `h-8 w-8 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 ${className}`;

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setOpen(true)}
        className={showLabel ? labelButtonClass : iconButtonClass}
      >
        <Trash2 className="w-4 h-4" />
        {showLabel && '삭제'}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmText="삭제"
        variant="danger"
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  );
}
