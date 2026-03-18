'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from '@/shared/components/ui';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { deleteProject } from '@/features/project/services/projects';
import type { Project } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

interface ProjectDeleteModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDeleteModal({ project, isOpen, onClose }: ProjectDeleteModalProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const canConfirm = confirmText === project.name;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success('프로젝트가 삭제되었습니다.');
      onClose();
      router.push('/projects');
    } catch (error) {
      logger.error('Failed to delete project:', error);
      toast.error('삭제 실패', {
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-red-600 dark:text-red-400">
              프로젝트 삭제
            </DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="pt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p className="font-semibold text-zinc-900 dark:text-white">
                &quot;{project.name}&quot; 프로젝트를 삭제하시겠습니까?
              </p>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md text-sm">
                <p className="font-medium mb-2 text-zinc-900 dark:text-white">
                  다음 데이터가 함께 삭제됩니다:
                </p>
                <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li>• 모든 건물 및 층 정보</li>
                  <li>• 지하층/건물 공정 계획</li>
                  <li>• 프로젝트 팀 멤버 정보</li>
                  <li>• 간트 차트 데이터</li>
                </ul>
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium">
                ⚠️ 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 dark:text-white">
            프로젝트명을 입력하여 삭제를 확인하세요
          </label>
          <Input
            placeholder={project.name}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
            className="font-mono"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={!canConfirm || isDeleting}
          >
            {isDeleting ? '삭제 중...' : '영구 삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
