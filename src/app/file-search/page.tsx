'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/client';
import {
  Sidebar,
  ChatArea,
  Notification,
  useFileSearch,
} from '@/components/file-search';

export default function FileSearchPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      const profile = await getCurrentUserProfile();
      if (profile && isSystemAdmin(profile)) {
        setIsAdmin(true);
      }
    };
    checkPermission();
  }, []);

  const {
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
    // 채팅 액션
    search,
    selectSession,
    createSession,
    deleteSession,
    // 알림 액션
    clearNotification,
  } = useFileSearch();

  return (
    <div className="fixed inset-0 top-16 flex bg-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        stores={stores}
        selectedStore={selectedStore}
        selectedStoreInfo={selectedStoreInfo}
        uploadedFiles={uploadedFiles}
        attachedFiles={attachedFiles}
        loading={loading}
        isAdmin={isAdmin}
        onSelectStore={selectStore}
        onCreateStore={createStore}
        onDeleteStore={deleteStore}
        onAttachFiles={attachFiles}
        onRemoveAttachedFile={removeAttachedFile}
        onClearAttachedFiles={clearAttachedFiles}
        onUploadFiles={uploadFiles}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onCreateSession={createSession}
        onDeleteSession={deleteSession}
      />

      {/* Main Chat Area */}
      <ChatArea
        messages={messages}
        selectedStore={selectedStore}
        selectedStoreInfo={selectedStoreInfo}
        isSearching={isSearching}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onSearch={search}
      />

      {/* Notifications */}
      <Notification
        error={error}
        success={success}
        onClose={clearNotification}
      />
    </div>
  );
}
