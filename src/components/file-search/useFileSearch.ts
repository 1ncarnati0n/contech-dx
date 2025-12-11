'use client';

import { useEffect, useCallback } from 'react';
import { useStoreManagement } from './useStoreManagement';
import { useFileManagement } from './useFileManagement';
import { useChatSession } from './useChatSession';

/**
 * File Search 통합 훅 (Facade Pattern)
 * 
 * 스토어 관리, 파일 관리, 채팅 세션 관리를 통합합니다.
 * 각 관심사는 개별 훅으로 분리되어 있습니다:
 * - useStoreManagement: 스토어 CRUD
 * - useFileManagement: 파일 업로드/관리
 * - useChatSession: 채팅 메시지/세션
 */
export function useFileSearch() {
  // 스토어 관리
  const storeManagement = useStoreManagement();
  const {
    stores,
    selectedStore,
    selectedStoreInfo,
    uploadedFiles,
    loading: storeLoading,
    error: storeError,
    success: storeSuccess,
    loadStores,
    loadStoreInfo,
    selectStore: rawSelectStore,
    createStore,
    deleteStore: rawDeleteStore,
    clearNotification: clearStoreNotification,
  } = storeManagement;

  // 채팅 세션 관리
  const chatSession = useChatSession({
    selectedStore,
    onStoreChange: rawSelectStore,
  });
  const {
    messages,
    isSearching,
    sessions,
    currentSessionId,
    search,
    stopSearch,
    selectSession,
    createSession,
    deleteSession,
    clearSessionsByStore,
  } = chatSession;

  // 파일 관리
  const fileManagement = useFileManagement({
    selectedStore,
    onUploadSuccess: () => loadStoreInfo(selectedStore),
    onDeleteSuccess: () => loadStoreInfo(selectedStore),
  });
  const {
    attachedFiles,
    loading: fileLoading,
    error: fileError,
    success: fileSuccess,
    attachFiles,
    removeAttachedFile,
    clearAttachedFiles,
    uploadFiles,
    deleteFile,
    clearNotification: clearFileNotification,
  } = fileManagement;

  // 초기 로드
  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // 스토어 선택 (파일 초기화 포함)
  const selectStore = useCallback(
    async (storeName: string) => {
      clearAttachedFiles();
      await rawSelectStore(storeName);
    },
    [clearAttachedFiles, rawSelectStore]
  );

  // 스토어 삭제 (관련 세션도 정리)
  const deleteStore = useCallback(async () => {
    const storeToDelete = selectedStore;
    const result = await rawDeleteStore();
    if (result) {
      clearSessionsByStore(storeToDelete);
    }
    return result;
  }, [selectedStore, rawDeleteStore, clearSessionsByStore]);

  // 통합 로딩/에러/성공 상태
  const loading = storeLoading || fileLoading;
  const error = storeError || fileError;
  const success = storeSuccess || fileSuccess;

  // 알림 제거
  const clearNotification = useCallback(() => {
    clearStoreNotification();
    clearFileNotification();
  }, [clearStoreNotification, clearFileNotification]);

  return {
    // 스토어 상태
    stores,
    selectedStore,
    selectedStoreInfo,
    uploadedFiles,
    
    // 파일 상태
    attachedFiles,
    
    // 채팅 상태
    messages,
    isSearching,
    sessions,
    currentSessionId,
    
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
    deleteFile,
    
    // 채팅 액션
    search,
    stopSearch,
    selectSession,
    createSession,
    deleteSession,
    
    // 공통 액션
    clearNotification,
  };
}
