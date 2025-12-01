'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import { filterValidFiles } from './utils';

interface UseFileManagementOptions {
  selectedStore: string;
  onUploadSuccess?: () => void;
}

/**
 * 파일 관리 훅
 * 파일 첨부, 업로드 로직을 담당합니다.
 */
export function useFileManagement({ selectedStore, onUploadSuccess }: UseFileManagementOptions) {
  // 파일 상태
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 파일 첨부
  const attachFiles = useCallback((files: File[]) => {
    const validFiles = filterValidFiles(files);
    setAttachedFiles((prev) => [...prev, ...validFiles]);
  }, []);

  // 첨부 파일 제거
  const removeAttachedFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 첨부 파일 전체 제거
  const clearAttachedFiles = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  // 파일 업로드
  const uploadFiles = useCallback(async (): Promise<boolean> => {
    if (attachedFiles.length === 0 || !selectedStore) return false;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('storeName', selectedStore);
      attachedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      const response = await fetch(API_ENDPOINTS.GEMINI_UPLOAD_FILE, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(`${attachedFiles.length}개 파일 업로드 완료`);
        setAttachedFiles([]);
        onUploadSuccess?.();
        return true;
      } else {
        setError(data.error || '업로드 실패');
        return false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [attachedFiles, selectedStore, onUploadSuccess]);

  // 알림 제거
  const clearNotification = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  return {
    // 상태
    attachedFiles,
    loading,
    error,
    success,
    // 액션
    attachFiles,
    removeAttachedFile,
    clearAttachedFiles,
    uploadFiles,
    clearNotification,
  };
}

export type FileManagementState = ReturnType<typeof useFileManagement>;

