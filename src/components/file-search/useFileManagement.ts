'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS, FILE_SIZE_LIMITS } from '@/lib/constants';
import { filterValidFiles, formatFileSize } from './utils';

interface UseFileManagementOptions {
  selectedStore: string;
  onUploadSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * 파일 관리 훅
 * 파일 첨부, 업로드 로직을 담당합니다.
 */
export function useFileManagement({ selectedStore, onUploadSuccess, onDeleteSuccess }: UseFileManagementOptions) {
  // 파일 상태
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 파일 첨부
  const attachFiles = useCallback((files: File[]) => {
    const validFiles = filterValidFiles(files);
    
    // 파일 크기 제한 체크
    const oversizedFiles: string[] = [];
    const validSizeFiles = validFiles.filter((file) => {
      if (file.size > FILE_SIZE_LIMITS.MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
        return false;
      }
      return true;
    });

    // 전체 크기 체크
    const currentTotalSize = attachedFiles.reduce((sum, f) => sum + f.size, 0);
    const newTotalSize = validSizeFiles.reduce((sum, f) => sum + f.size, 0);
    
    if (currentTotalSize + newTotalSize > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE) {
      setError(`전체 파일 크기가 ${formatFileSize(FILE_SIZE_LIMITS.MAX_TOTAL_SIZE)}를 초과합니다.`);
      return;
    }

    if (oversizedFiles.length > 0) {
      setError(`다음 파일의 크기가 너무 큽니다 (최대 ${formatFileSize(FILE_SIZE_LIMITS.MAX_FILE_SIZE)}): ${oversizedFiles.join(', ')}`);
    }

    setAttachedFiles((prev) => [...prev, ...validSizeFiles]);
    if (validSizeFiles.length > 0 && oversizedFiles.length === 0) {
      setError(''); // 에러 초기화
    }
  }, [attachedFiles]);

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

  // 파일 삭제
  const deleteFile = useCallback(async (fileName: string): Promise<boolean> => {
    if (!selectedStore || !fileName) return false;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(API_ENDPOINTS.GEMINI_DELETE_FILE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: selectedStore, fileName }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess('파일이 삭제되었습니다.');
        onDeleteSuccess?.();
        return true;
      } else {
        setError(data.error || '파일 삭제 실패');
        return false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedStore, onDeleteSuccess]);

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
    deleteFile,
    clearNotification,
  };
}

export type FileManagementState = ReturnType<typeof useFileManagement>;

