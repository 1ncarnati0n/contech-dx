'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { FileSearchStore, UploadedFile } from './types';

/**
 * 스토어 관리 훅
 * 스토어 CRUD 및 선택 로직을 담당합니다.
 */
export function useStoreManagement() {
  // 스토어 상태
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<FileSearchStore | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 스토어 목록 로드
  const loadStores = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GEMINI_LIST_STORES);
      const data = await response.json();
      if (data.success) {
        setStores(data.stores);
      }
    } catch (err) {
      console.error('Error loading stores:', err);
    }
  }, []);

  // 스토어 상세 정보 로드
  const loadStoreInfo = useCallback(async (storeName: string) => {
    try {
      const [storeResponse, filesResponse] = await Promise.all([
        fetch(API_ENDPOINTS.GEMINI_GET_STORE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeName }),
        }),
        fetch(API_ENDPOINTS.GEMINI_LIST_FILES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeName }),
        }),
      ]);

      const [storeData, filesData] = await Promise.all([
        storeResponse.json(),
        filesResponse.json(),
      ]);

      if (storeData.success) setSelectedStoreInfo(storeData.store);
      if (filesData.success) setUploadedFiles(filesData.documents || []);
    } catch (err) {
      console.error('Error loading store info:', err);
    }
  }, []);

  // 스토어 선택
  const selectStore = useCallback(
    async (storeName: string) => {
      setSelectedStore(storeName);

      if (storeName) {
        await loadStoreInfo(storeName);
      } else {
        setSelectedStoreInfo(null);
        setUploadedFiles([]);
      }
    },
    [loadStoreInfo]
  );

  // 스토어 생성
  const createStore = useCallback(
    async (displayName: string): Promise<boolean> => {
      if (!displayName.trim()) return false;

      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await fetch(API_ENDPOINTS.GEMINI_CREATE_STORE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName }),
        });
        const data = await response.json();

        if (data.success) {
          setSuccess('스토어가 생성되었습니다.');
          await loadStores();
          await selectStore(data.store.name);
          return true;
        } else {
          setError(data.error || '스토어 생성 실패');
          return false;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadStores, selectStore]
  );

  // 스토어 삭제
  const deleteStore = useCallback(async (): Promise<boolean> => {
    if (!selectedStore) return false;

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.GEMINI_DELETE_STORE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: selectedStore, force: true }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess('스토어가 삭제되었습니다.');
        setSelectedStore('');
        setSelectedStoreInfo(null);
        setUploadedFiles([]);
        await loadStores();
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedStore, loadStores]);

  // 알림 제거
  const clearNotification = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  return {
    // 상태
    stores,
    selectedStore,
    selectedStoreInfo,
    uploadedFiles,
    loading,
    error,
    success,
    // 액션
    loadStores,
    loadStoreInfo,
    selectStore,
    createStore,
    deleteStore,
    clearNotification,
    // 내부 setter (다른 훅에서 사용)
    setUploadedFiles,
  };
}

export type StoreManagementState = ReturnType<typeof useStoreManagement>;

