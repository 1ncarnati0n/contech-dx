'use client';

import { useState } from 'react';
import {
  Upload,
  Trash2,
  X,
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { formatFileSize, ALLOWED_EXTENSIONS } from './utils';
import type { FileSearchStore, UploadedFile, ChatSession } from './types';

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
  onDeleteFile?: (fileName: string) => void;

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
  onDeleteFile,

  sessions = [],
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: SidebarProps) {
  const [newStoreName, setNewStoreName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isStoreExpanded, setIsStoreExpanded] = useState(true);

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
      className={`absolute inset-y-0 left-0 z-30 w-80 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
    >
      {/* Mobile Header */}
      <div className="lg:hidden p-4 pb-0 flex justify-end shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">

        {/* 1. Store & Files Section (Top) */}
        <div className="space-y-3">
          <button
            onClick={() => setIsStoreExpanded(!isStoreExpanded)}
            className="flex items-center justify-between w-full text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-2 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <span>문서함 설정</span>
            {isStoreExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {isStoreExpanded && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Store Selector */}
              <div className="space-y-2">
                <select
                  value={selectedStore}
                  onChange={(e) => onSelectStore(e.target.value)}
                  className="w-full p-2 rounded-lg text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                >
                  <option value="">스토어 선택...</option>
                  {stores.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.displayName}
                    </option>
                  ))}
                </select>

                <form onSubmit={handleCreateStore} className="flex gap-2">
                  <Input
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="새 문서함 이름"
                    className="h-8 text-xs bg-white dark:bg-zinc-800"
                  />
                  <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!newStoreName.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </form>
              </div>

              {/* Selected Store Info */}
              {selectedStoreInfo && (
                <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{selectedStoreInfo.displayName}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatFileSize(selectedStoreInfo.sizeBytes || 0)}</span>
                      <button
                        onClick={handleDeleteStore}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="문서함 삭제"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* File Upload Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-lg p-3 text-center transition-colors ${isDragging
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                        : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
                      }`}
                  >
                    <label className="cursor-pointer flex flex-col items-center gap-1">
                      <Upload className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-500">파일 추가</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept={ALLOWED_EXTENSIONS.join(',')}
                      />
                    </label>
                  </div>

                  {/* Attached Files */}
                  {attachedFiles.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>대기중 ({attachedFiles.length})</span>
                        <button onClick={onClearAttachedFiles} className="text-red-500 hover:underline">비우기</button>
                      </div>
                      {attachedFiles.map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-800 p-1.5 rounded border border-zinc-200 dark:border-zinc-700">
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-zinc-700 dark:text-zinc-300">{f.name}</div>
                            <div className="text-[10px] text-zinc-400">{formatFileSize(f.size)}</div>
                          </div>
                          <button onClick={() => onRemoveAttachedFile(i)} className="ml-2 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors">
                            <X className="w-3 h-3 text-zinc-400" />
                          </button>
                        </div>
                      ))}
                      <Button 
                        onClick={onUploadFiles} 
                        disabled={loading || attachedFiles.length === 0} 
                        size="sm" 
                        className="w-full h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? '업로드 중...' : `${attachedFiles.length}개 파일 업로드`}
                      </Button>
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                        <FileText className="w-3 h-3" />
                        <span>업로드된 파일 ({uploadedFiles.length}개)</span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {uploadedFiles.map((file) => (
                          <div key={file.name} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-800 p-1.5 rounded border border-zinc-200 dark:border-zinc-700">
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-zinc-700 dark:text-zinc-300">{file.displayName}</div>
                              <div className="text-[10px] text-zinc-400">{formatFileSize(file.sizeBytes)}</div>
                            </div>
                            {onDeleteFile && (
                              <button
                                onClick={() => {
                                  if (confirm('파일을 삭제하시겠습니까?')) {
                                    onDeleteFile(file.name);
                                  }
                                }}
                                className="ml-2 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="파일 삭제"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {uploadedFiles.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <FileText className="w-3 h-3" />
                      <span>업로드된 파일: 0개</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />

        {/* 2. History Section (Bottom of scrollable area) */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-2">
            최근 대화
          </h3>
          <div className="space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                <p>대화 내역이 없습니다.</p>
              </div>
            ) : (
              sessions.map(session => {
                const isCurrent = currentSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession?.(session.id)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isCurrent
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                      }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                    <span className="truncate flex-1">
                      {session.title || '새로운 대화'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('대화를 삭제하시겠습니까?')) onDeleteSession?.(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer: New Chat Button */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 z-10">
        <Button
          onClick={onCreateSession}
          disabled={!selectedStore}
          className="w-full justify-start gap-2 h-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>새로운 대화</span>
        </Button>
      </div>
    </div>
  );
}