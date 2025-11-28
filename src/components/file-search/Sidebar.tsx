'use client';

import { useState } from 'react';
import {
  FolderPlus,
  Upload,
  Trash2,
  X,
  FileType,
  Database,
  Plus,
  History,
  MessageSquare
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { formatFileSize, getFileIcon, ALLOWED_EXTENSIONS } from './utils';
import type { FileSearchStore, UploadedFile, ChatSession } from './types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  stores: FileSearchStore[];
  selectedStore: string;
  selectedStoreInfo: FileSearchStore | null;
  uploadedFiles: UploadedFile[];
  attachedFiles: File[];
  loading: boolean;
  isAdmin?: boolean;
  onSelectStore: (storeName: string) => void;
  onCreateStore: (displayName: string) => Promise<boolean>;
  onDeleteStore: () => void;
  onAttachFiles: (files: File[]) => void;
  onRemoveAttachedFile: (index: number) => void;
  onClearAttachedFiles: () => void;
  onUploadFiles: () => void;

  // 채팅 세션 관련 props
  sessions?: ChatSession[];
  currentSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onCreateSession?: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  stores,
  selectedStore,
  selectedStoreInfo,
  uploadedFiles,
  attachedFiles,
  loading,
  isAdmin = false,
  onSelectStore,
  onCreateStore,
  onDeleteStore,
  onAttachFiles,
  onRemoveAttachedFile,
  onClearAttachedFiles,
  onUploadFiles,

  sessions = [],
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: SidebarProps) {
  const [newStoreName, setNewStoreName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onCreateStore(newStoreName);
    if (success) {
      setNewStoreName('');
    }
  };

  const handleDeleteStore = () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      onDeleteStore();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onAttachFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAttachFiles(Array.from(e.target.files));
    }
  };

  return (
    <div
      className={`absolute inset-y-0 left-0 z-30 w-80 bg-slate-50 dark:bg-primary-900 border-r border-slate-200 dark:border-primary-800 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
    >
      {/* Header */}
      <div className="h-20 p-4 border-b border-slate-200 dark:border-primary-800 flex items-center justify-between bg-white dark:bg-primary-900 shrink-0">
        <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
          <Database className="w-5 h-5 text-orange-600 dark:text-orange-500" />
          스토어 관리
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="lg:hidden text-slate-500 dark:text-primary-400"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* New Store (Admin Only) */}
        {isAdmin && (
          <form onSubmit={handleCreateStore} className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-primary-300">
              새 스토어 만들기
            </label>
            <div className="flex gap-2">
              <Input
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="이름 입력"
                className="h-9 text-sm bg-white dark:bg-primary-800 border-slate-200 dark:border-primary-700 text-slate-900 dark:text-white"
              />
              <Button
                type="submit"
                disabled={loading || !newStoreName.trim()}
                size="sm"
                variant="primary"
                className="h-9 px-3"
              >
                <FolderPlus className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}

        {/* Store Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-primary-300">
            현재 스토어
          </label>
          <select
            value={selectedStore}
            onChange={(e) => onSelectStore(e.target.value)}
            className="w-full p-2 border rounded-md text-sm bg-white dark:bg-primary-800 border-slate-200 dark:border-primary-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- 선택하세요 --</option>
            {stores.map((s) => (
              <option key={s.name} value={s.name}>
                {s.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* File Management (Selected Store Only) */}
        {selectedStoreInfo && (
          <div className="space-y-4 border-t border-slate-200 dark:border-primary-800 pt-4">
            {/* Store Info Card */}
            <div className="bg-white dark:bg-primary-800 p-3 rounded-lg border border-slate-200 dark:border-primary-700 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  {selectedStoreInfo.displayName}
                </h3>
                <span className="text-xs text-slate-500 dark:text-primary-400">
                  {formatFileSize(selectedStoreInfo.sizeBytes || 0)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-green-50 dark:bg-green-900/30 p-1 rounded text-green-700 dark:text-green-400">
                  <div className="font-bold">
                    {selectedStoreInfo.activeDocumentsCount || 0}
                  </div>
                  <div>활성</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/30 p-1 rounded text-orange-700 dark:text-orange-400">
                  <div className="font-bold">
                    {selectedStoreInfo.pendingDocumentsCount || 0}
                  </div>
                  <div>처리중</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 p-1 rounded text-red-700 dark:text-red-400">
                  <div className="font-bold">
                    {selectedStoreInfo.failedDocumentsCount || 0}
                  </div>
                  <div>실패</div>
                </div>
              </div>
              {isAdmin && (
                <Button
                  onClick={handleDeleteStore}
                  variant="danger"
                  size="sm"
                  className="w-full mt-3 h-7 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> 스토어 삭제
                </Button>
              )}
            </div>

            {/* File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDragging
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-slate-300 dark:border-primary-700 bg-slate-50 dark:bg-primary-800/50'
                }`}
            >
              <p className="text-xs text-slate-600 dark:text-primary-400 mb-2">
                파일을 드래그하거나 선택하세요
              </p>
              <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 dark:bg-primary-700 text-white rounded text-xs hover:bg-slate-800 dark:hover:bg-primary-600">
                <Upload className="w-3 h-3" /> 파일 선택
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept={ALLOWED_EXTENSIONS.join(',')}
                />
              </label>
            </div>

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-primary-400">
                  <span>대기중 ({attachedFiles.length})</span>
                  <button
                    onClick={onClearAttachedFiles}
                    className="text-red-500 hover:underline"
                  >
                    비우기
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {attachedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs bg-white dark:bg-primary-800 p-1.5 rounded border border-slate-200 dark:border-primary-700 text-slate-900 dark:text-white"
                    >
                      <span className="truncate flex-1">{f.name}</span>
                      <button onClick={() => onRemoveAttachedFile(i)}>
                        <X className="w-3 h-3 text-slate-400 dark:text-primary-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={onUploadFiles}
                  disabled={loading}
                  className="w-full h-8 text-xs"
                  variant="accent"
                >
                  업로드 시작
                </Button>
              </div>
            )}

            {/* Uploaded Files List */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-primary-300 flex items-center gap-1">
                <FileType className="w-3 h-3" /> 업로드된 파일 (
                {uploadedFiles.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {uploadedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs bg-white dark:bg-primary-800 p-2 rounded border border-slate-100 dark:border-primary-700 text-slate-900 dark:text-white"
                  >
                    <span className="text-slate-500 dark:text-primary-400">{getFileIcon(f.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{f.displayName}</div>
                      <div className="text-[10px] text-slate-400 dark:text-primary-500">
                        {formatFileSize(f.sizeBytes)} • {f.state}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat Sessions List */}
        <div className="border-t border-slate-200 dark:border-primary-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-primary-400 uppercase tracking-wider">
              대화 목록
            </h3>
            <Button
              onClick={onCreateSession}
              disabled={!selectedStore}
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!selectedStore ? "스토어를 먼저 선택해주세요" : "새 채팅 시작"}
            >
              <Plus className="w-4 h-4 mr-1" /> 새 채팅
            </Button>
          </div>

          <div className="space-y-2 pb-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-primary-500 text-sm border border-dashed border-slate-200 dark:border-primary-700 rounded-lg bg-slate-50/50 dark:bg-primary-800/20">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>저장된 대화가 없습니다.</p>
              </div>
            ) : (
              sessions.map(session => {
                const sessionStore = stores.find(s => s.name === session.storeName);
                const isCurrent = currentSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession?.(session.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all group relative ${isCurrent
                        ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 ring-1 ring-cyan-200 dark:ring-cyan-800 shadow-sm'
                        : 'bg-white dark:bg-primary-800 border-slate-200 dark:border-primary-700 hover:border-cyan-200 dark:hover:border-cyan-800 hover:bg-slate-50 dark:hover:bg-primary-700'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-medium text-sm truncate flex-1 pr-2 ${isCurrent ? 'text-cyan-900 dark:text-cyan-100' : 'text-slate-900 dark:text-white'
                        }`}>
                        {session.title || '새로운 대화'}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('대화를 삭제하시겠습니까?')) onDeleteSession?.(session.id);
                        }}
                        className="text-slate-300 hover:text-red-500 dark:text-primary-600 dark:hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-primary-400 truncate mb-2 min-h-[1.2em]">
                      {session.preview || '대화 내용 없음'}
                    </p>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100/50 dark:border-primary-700/50">
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-primary-700 text-slate-600 dark:text-primary-300 rounded border border-slate-200 dark:border-primary-600 truncate max-w-[100px]">
                        {sessionStore?.displayName || '삭제된 스토어'}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-primary-500 flex items-center gap-1 ml-auto">
                        <History className="w-3 h-3" />
                        {formatDistanceToNow(session.updatedAt, { addSuffix: true, locale: ko })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}