'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FileSearchStore, UploadedFile, Message } from './types';
import { filterValidFiles } from './utils';

/**
 * File Search 기능을 위한 커스텀 훅
 */
export function useFileSearch() {
  // Store 상태
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<FileSearchStore | null>(null);

  // 파일 상태
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // 채팅 상태
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 초기 로드
  useEffect(() => {
    loadStores();
  }, []);

  // 스토어 목록 로드
  const loadStores = useCallback(async () => {
    try {
      const response = await fetch('/api/gemini/list-stores');
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
        fetch('/api/gemini/get-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeName }),
        }),
        fetch('/api/gemini/list-files', {
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
      setAttachedFiles([]);
      setMessages([]);

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
        const response = await fetch('/api/gemini/create-store', {
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
  const deleteStore = useCallback(async () => {
    if (!selectedStore) return;

    setLoading(true);
    try {
      const response = await fetch('/api/gemini/delete-store', {
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
        setMessages([]);
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
  const uploadFiles = useCallback(async () => {
    if (attachedFiles.length === 0 || !selectedStore) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('storeName', selectedStore);
      attachedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      const response = await fetch('/api/gemini/upload-file', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(`${attachedFiles.length}개 파일 업로드 완료`);
        setAttachedFiles([]);
        await loadStoreInfo(selectedStore);
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
  }, [attachedFiles, selectedStore, loadStoreInfo]);

  // 검색 (채팅)
  const search = useCallback(
    async (query: string) => {
      if (!query.trim() || !selectedStore) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsSearching(true);

      try {
        const response = await fetch('/api/gemini/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, storeName: selectedStore }),
        });
        const data = await response.json();

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: data.success
            ? data.answer
            : `오류가 발생했습니다: ${data.error || '알 수 없는 오류'}`,
          citations: data.success ? data.citations : undefined,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: `네트워크 오류가 발생했습니다: ${message}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsSearching(false);
      }
    },
    [selectedStore]
  );

  // 알림 제거
  const clearNotification = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  return {
    // 스토어 상태
    stores,
    selectedStore,
    selectedStoreInfo,
    // 파일 상태
    attachedFiles,
    uploadedFiles,
    // 채팅 상태
    messages,
    isSearching,
    // UI 상태
    loading,
    error,
    success,
    // 스토어 액션
    selectStore,
    createStore,
    deleteStore,
    // 파일 액션
    attachFiles,
    removeAttachedFile,
    clearAttachedFiles,
    uploadFiles,
    // 채팅 액션
    search,
    // 알림 액션
    clearNotification,
  };
}
